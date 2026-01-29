
# Phase 2: Reliability Improvements

A targeted set of reliability enhancements focused on circuit breaker patterns for upstream API protection and parallel data fetching to reduce request waterfalls in the frontend.

---

## Summary

This plan addresses two major reliability gaps identified in the architecture review:

1. **Circuit Breaker Pattern** - Protect edge functions from cascading failures when upstream APIs (StockTwits, Yahoo Finance) are unavailable or rate-limited
2. **Parallel Data Fetching** - Reduce SymbolPage load times by parallelizing independent data requests

Estimated implementation time: 2-3 hours
Risk level: Low-Medium (new patterns, but isolated to specific modules)

---

## Problem Statement

### Current Vulnerabilities

**Upstream API Failures**
- StockTwits API returns HTML 500/502 error pages instead of JSON ~5% of requests
- Yahoo Finance rate limits aggressively (429 responses)
- No circuit breaker = every user request hammers failing upstream, worsening outages

**Frontend Request Waterfall**
- SymbolPage makes 5-8 sequential API calls on mount
- Each call waits for auth session check before firing
- Users see loading states for 3-5+ seconds even when data is cached

---

## 1. Circuit Breaker Implementation

### Design Overview

Create a lightweight circuit breaker module for edge functions that:
- Tracks failure rates per upstream endpoint
- Opens circuit after 5 consecutive failures (stops calling upstream)
- Returns cached data or graceful degradation during open state
- Auto-resets after 30s cooldown period (half-open state)

```text
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Edge Func   │───▶│  Circuit Breaker │───▶│   Upstream API  │
│ Request     │    │                  │    │ (StockTwits)    │
└─────────────┘    │ State: CLOSED    │    └─────────────────┘
                   │ Failures: 0/5    │
                   └──────────────────┘
                            │
                   ┌────────▼────────┐
                   │   5 failures    │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  State: OPEN    │───▶ Return cached/fallback
                   │  Wait 30s       │     (no upstream call)
                   └────────┬────────┘
                            │ 30s elapsed
                   ┌────────▼────────┐
                   │ State: HALF-OPEN│───▶ Allow 1 test request
                   └─────────────────┘
```

### Implementation: Shared Circuit Breaker Module

Create a new shared module at `supabase/functions/_shared/circuit-breaker.ts`:

```typescript
interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  lastSuccess: number;
}

const circuits: Map<string, CircuitState> = new Map();

const CONFIG = {
  failureThreshold: 5,      // Open after 5 failures
  resetTimeout: 30000,      // 30 seconds before half-open
  halfOpenSuccesses: 2,     // Successes needed to close
};

export function canMakeRequest(circuitId: string): boolean {
  const state = circuits.get(circuitId);
  if (!state) return true; // No circuit = allow
  
  if (state.state === 'closed') return true;
  
  if (state.state === 'open') {
    // Check if cooldown elapsed
    if (Date.now() - state.lastFailure > CONFIG.resetTimeout) {
      state.state = 'half-open';
      return true;
    }
    return false;
  }
  
  // half-open: allow limited requests
  return true;
}

export function recordSuccess(circuitId: string): void {
  const state = circuits.get(circuitId) || createInitialState();
  state.failures = 0;
  state.state = 'closed';
  state.lastSuccess = Date.now();
  circuits.set(circuitId, state);
}

export function recordFailure(circuitId: string): void {
  const state = circuits.get(circuitId) || createInitialState();
  state.failures++;
  state.lastFailure = Date.now();
  
  if (state.failures >= CONFIG.failureThreshold) {
    state.state = 'open';
    console.warn(`Circuit ${circuitId} OPENED after ${state.failures} failures`);
  }
  
  circuits.set(circuitId, state);
}

export function getCircuitState(circuitId: string): CircuitState | undefined {
  return circuits.get(circuitId);
}
```

### Integration: stocktwits-proxy

Update `supabase/functions/stocktwits-proxy/index.ts` to use the circuit breaker:

```typescript
import { canMakeRequest, recordSuccess, recordFailure, getCircuitState } from '../_shared/circuit-breaker.ts';

const CIRCUIT_ID = 'stocktwits-upstream';

// Inside request handler, before upstream fetch:
if (!canMakeRequest(CIRCUIT_ID)) {
  const circuitState = getCircuitState(CIRCUIT_ID);
  console.warn(`Circuit OPEN for ${CIRCUIT_ID}, attempting cache fallback`);
  
  // Try to serve from cache even if stale
  const staleCache = await getCachedResponse(supabase, cacheKey);
  if (staleCache) {
    return new Response(
      JSON.stringify({ ...staleCache, _degraded: true, _reason: 'circuit_open' }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Circuit': 'OPEN',
          'X-Cache': 'STALE',
        } 
      }
    );
  }
  
  // No cache available - return service unavailable
  return new Response(
    JSON.stringify({ 
      error: 'Service temporarily unavailable',
      retryAfter: 30,
      _circuit: 'open'
    }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// After successful fetch:
recordSuccess(CIRCUIT_ID);

// On failure (429, 5xx, non-JSON response):
recordFailure(CIRCUIT_ID);
```

### Integration: stock-price-proxy

Apply the same pattern to `supabase/functions/stock-price-proxy/index.ts`:

```typescript
const CIRCUIT_ID = 'yahoo-finance';

// Before Yahoo fetch:
if (!canMakeRequest(CIRCUIT_ID)) {
  // Use stale memory cache as fallback
  const staleCache = memoryCache.get(cacheKey);
  if (staleCache) {
    return new Response(
      JSON.stringify({ ...staleCache.data, _degraded: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Circuit': 'OPEN' } }
    );
  }
  // Return 503 if no cache
}
```

---

## 2. Parallel Data Fetching

### Current Problem

The SymbolPage initiates requests sequentially because:
1. Each hook independently calls `supabase.auth.getSession()` before fetching
2. React Query defaults to serial execution per component mount order
3. No request batching or coordination

### Solution: Parallel Query Coordination

**Option A: React Query's useQueries (Recommended)**

Consolidate independent queries into a single `useQueries` call that fires all requests in parallel:

```typescript
// src/hooks/use-symbol-page-data.ts
import { useQueries } from '@tanstack/react-query';

export function useSymbolPageData(symbol: string, enabled: boolean = true) {
  const results = useQueries({
    queries: [
      {
        queryKey: ['symbol-stats', symbol],
        queryFn: () => stocktwitsApi.getSymbolStats(symbol),
        enabled,
        staleTime: 30_000,
      },
      {
        queryKey: ['symbol-messages', symbol],
        queryFn: () => stocktwitsApi.getMessages(symbol, 50),
        enabled,
        staleTime: 60_000,
      },
      {
        queryKey: ['decision-lens-summary', symbol, 'summary'],
        queryFn: async () => {
          const { data } = await supabase.functions.invoke('generate-lens-summary', {
            body: { symbol, lens: 'summary' }
          });
          return data;
        },
        enabled,
        staleTime: 5 * 60_000,
      },
    ],
  });

  return {
    stats: results[0],
    messages: results[1],
    lensSummary: results[2],
    isLoading: results.some(r => r.isLoading),
    isError: results.some(r => r.isError),
  };
}
```

**Option B: Session Pre-warming**

Cache the auth session once at app mount and reuse across all hooks:

```typescript
// src/lib/auth-session.ts
let cachedSession: Session | null = null;
let sessionPromise: Promise<Session | null> | null = null;

export async function getSession(): Promise<Session | null> {
  if (cachedSession) return cachedSession;
  
  if (!sessionPromise) {
    sessionPromise = supabase.auth.getSession().then(({ data }) => {
      cachedSession = data.session;
      return cachedSession;
    });
  }
  
  return sessionPromise;
}

// Use in stocktwits-api.ts:
const session = await getSession(); // Instant after first call
```

### Implementation Plan

1. **Create `use-symbol-page-data.ts`** - New hook combining core data fetches
2. **Update `stocktwits-api.ts`** - Add session caching to eliminate redundant auth calls
3. **Update `SymbolPage.tsx`** - Use the new consolidated hook for initial data

### Expected Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Initial API calls | 5-8 sequential | 3-5 parallel |
| Time to interactive | 3-5s | 1-2s |
| Auth session calls | 5-8 per page | 1 per session |

---

## 3. Implementation Sequence

### Step 1: Circuit Breaker Module (Backend)
1. Create `supabase/functions/_shared/circuit-breaker.ts`
2. Update `stocktwits-proxy/index.ts` to use circuit breaker
3. Update `stock-price-proxy/index.ts` to use circuit breaker
4. Deploy and test with forced failures

### Step 2: Parallel Data Fetching (Frontend)
1. Create `src/lib/auth-session.ts` for session caching
2. Update `src/lib/stocktwits-api.ts` to use cached session
3. Create `src/hooks/use-symbol-page-data.ts` with useQueries
4. Update `src/pages/SymbolPage.tsx` to use new consolidated hook
5. Verify parallel requests in Network tab

### Step 3: Observability Headers
Add response headers for debugging:
- `X-Circuit: OPEN|CLOSED|HALF-OPEN`
- `X-Cache: HIT|MISS|STALE`
- `X-Degraded: true` (when serving fallback data)

---

## 4. Verification Steps

### Circuit Breaker Testing
1. Temporarily block upstream API in edge function
2. Make 6+ requests - observe circuit opens after 5th
3. Wait 30s - observe half-open state allows test request
4. Restore API - observe circuit closes on success

### Parallel Fetch Testing
1. Open Network tab in browser
2. Navigate to SymbolPage
3. Observe API requests firing simultaneously (not waterfall)
4. Check that total load time is reduced by ~50%

### Degraded Mode Testing
1. With circuit open, observe `X-Degraded: true` header
2. UI should show data with subtle "Data may be stale" indicator
3. Retry button should force fresh fetch (bypass circuit for single request)

---

## 5. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Circuit opens too aggressively | Start with 5 failures threshold, tune based on logs |
| Memory leaks in circuit state | Circuit map is small (2-3 entries), auto-cleanup on success |
| Parallel queries cause rate limits | Already rate-limited by server cache; queries share cached data |
| Breaking existing hook consumers | Keep existing hooks, add new consolidated hook as opt-in |

---

## 6. Files to Create/Modify

### New Files
- `supabase/functions/_shared/circuit-breaker.ts` - Circuit breaker module
- `src/lib/auth-session.ts` - Session caching utility
- `src/hooks/use-symbol-page-data.ts` - Consolidated data hook

### Modified Files
- `supabase/functions/stocktwits-proxy/index.ts` - Add circuit breaker integration
- `supabase/functions/stock-price-proxy/index.ts` - Add circuit breaker integration
- `src/lib/stocktwits-api.ts` - Use cached session
- `src/pages/SymbolPage.tsx` - Use parallel data hook

---

## Technical Notes

- Circuit breaker uses in-memory state (resets on function cold start) - acceptable for edge functions as each instance handles burst traffic
- Session caching persists for tab lifetime via module scope
- Existing individual hooks remain functional for components that don't need parallel loading
- `X-Degraded` header allows frontend to show stale data indicators when serving from circuit-open fallback
