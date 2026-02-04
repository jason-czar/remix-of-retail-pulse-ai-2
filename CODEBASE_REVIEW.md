# Codebase Review: Retail Pulse AI / DeriveStreet

**Review Date:** February 4, 2026  
**Reviewer:** AI Code Review Agent  
**Codebase Size:** ~41,500 lines of TypeScript/TSX

---

## Executive Summary

DeriveStreet (formerly Retail Pulse AI) is a sophisticated institutional-grade retail sentiment intelligence platform that transforms StockTwits social data into actionable decision-support insights. The codebase demonstrates **mature architecture patterns**, excellent separation of concerns, and thoughtful performance optimization. Built with React 18, Vite, Supabase, and TanStack Query, it features a well-designed "Decision Lens" framework that provides AI-generated investment analysis through multiple strategic perspectives.

**Overall Quality Rating: 8.5/10**

### Key Strengths
- Excellent component architecture with proper separation of concerns
- Sophisticated caching strategy (SWR, circuit breakers, multi-tier)
- Well-implemented Decision Lens framework for institutional analysis
- Strong TypeScript typing with comprehensive Supabase schema
- Thoughtful performance optimizations (lazy loading, code splitting, viewport-based rendering)

### Key Areas for Improvement
- Some hooks have grown large and should be split
- Inconsistent error handling patterns in frontend
- Missing unit test infrastructure
- Some duplicated styling patterns could be abstracted

---

## App Overview

### What It Does
DeriveStreet is a B2B SaaS platform that:
1. Aggregates and analyzes retail investor sentiment from StockTwits
2. Applies AI-powered "Decision Lenses" to filter discussions through institutional perspectives
3. Tracks narrative coherence, emotion momentum, and market psychology signals
4. Provides historical pattern matching for predictive insights
5. Offers an AI chat interface ("Ask DeriveStreet") for conversational analysis

### Target Users
- **Primary:** Institutional investors (hedge funds, asset managers)
- **Secondary:** Equity research analysts, corporate strategy teams
- **Use Cases:** 
  - Pre-trade sentiment validation
  - Earnings reaction monitoring
  - M&A speculation tracking
  - Activist risk assessment

### Key Features
1. **Decision Lenses** - 9 default + custom user-defined analysis perspectives
2. **Psychology Snapshots** - Comprehensive state capture with signals (euphoria, capitulation)
3. **Narrative Coherence Scoring** - Measures discussion fragmentation
4. **Historical Episode Matching** - Pattern matching against past scenarios
5. **Ask DeriveStreet** - AI-powered conversational analysis interface

---

## Architecture Breakdown

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend Framework | React 18.3.1 + TypeScript 5.8 |
| Build Tool | Vite 5.4 (with SWC) |
| Routing | React Router DOM 6.30 |
| State Management | TanStack Query 5.83 + React Context |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Styling | Tailwind CSS 3.4 + shadcn/ui components |
| Animation | Framer Motion 12.26 |
| Charts | Recharts 2.15 |
| AI Gateway | Lovable AI Gateway (Gemini Flash) |

### Directory Structure
```
src/
├── App.tsx                    # Root with routing, providers
├── main.tsx                   # Entry point
├── components/
│   ├── ui/                    # shadcn/ui primitives + custom components
│   ├── layout/                # AppLayout, Sidebar, Header, Footer
│   ├── landing/               # Marketing page sections
│   ├── charts/                # Recharts wrappers + lazy loaders
│   ├── skeletons/             # Loading state components
│   ├── ask/                   # AI chat interface components
│   ├── alerts/                # Alert management
│   └── monitoring/            # Data coverage monitoring
├── contexts/
│   ├── AuthContext.tsx        # Supabase auth wrapper
│   ├── AskDeriveStreetContext.tsx  # Chat state management
│   └── MessagesSidebarContext.tsx
├── hooks/                     # 29 custom hooks for data fetching/logic
├── lib/                       # Utilities, API clients, error reporting
├── integrations/supabase/     # Auto-generated types + client
└── pages/                     # Route components (18 pages)

supabase/functions/            # 18 Edge Functions
├── stocktwits-proxy/          # Cached API proxy with circuit breaker
├── generate-lens-summary/     # AI-powered lens analysis
├── record-psychology-snapshot/ # Psychology data capture
├── compute-narrative-outcomes/ # Historical outcome calculation
└── ...
```

### Data Flow
```
StockTwits API
     ↓
stocktwits-proxy (Edge Function)
  - Circuit breaker protection
  - Response caching (1-2 min TTL)
  - Stale-while-revalidate
     ↓
Frontend React Query Hooks
  - Multi-tier caching (memory + staleTime)
  - Background refetch
     ↓
Components
  - Lazy loaded charts
  - Viewport-based rendering (LazyLoad)
  - Skeleton loading states
```

### Key Architectural Decisions

1. **Proxy Pattern for External APIs**
   - All StockTwits calls route through `stocktwits-proxy` Edge Function
   - Enables caching, rate limiting, and circuit breaker protection
   - Response caching in `stocktwits_response_cache` table

2. **Stale-While-Revalidate (SWR) Pattern**
   - Implemented in `generate-lens-summary` with grace periods
   - Returns stale data immediately, refreshes in background
   - Improves perceived performance significantly

3. **Psychology Snapshot System**
   - Periodic snapshots capture full market psychology state
   - Stored in `psychology_snapshots` table with JSONB fields
   - Enables historical analysis and pattern matching

4. **Decision Lens Framework**
   - 9 predefined institutional analysis perspectives
   - Custom lens support with user-defined focus areas
   - AI generates lens-specific summaries with confidence scores

---

## Code Quality Findings

### Strengths ✅

#### 1. Excellent TypeScript Usage
The Supabase types (`src/integrations/supabase/types.ts`) are comprehensive and auto-generated, ensuring type safety across the stack.

```typescript
// Example: Well-typed psychology snapshot hook
export interface PsychologySnapshot {
  id: string;
  symbol: string;
  period_type: PeriodType;
  observed_state: ObservedState;
  interpretation: Interpretation;
  // ... comprehensive typing
}
```

#### 2. Sophisticated Caching Architecture
Multiple caching layers with appropriate TTLs:
```typescript
// src/lib/cache-config.ts
export const CACHE_TTL = {
  LENS_SUMMARY: { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 },
  // Intelligent cache configuration
};
```

#### 3. Robust Error Handling in Edge Functions
The `stocktwits-proxy` implements excellent resilience patterns:
- Circuit breaker with failure tracking
- Stale cache fallback
- Structured logging with request IDs
- Error reporting to `error_logs` table

#### 4. Performance Optimizations
- Route-based code splitting (`lazy()` imports)
- Viewport-based lazy loading (`LazyLoad` component)
- Skeleton states that match actual content layout
- Chart-specific skeleton variants

```typescript
// src/components/ui/LazyLoad.tsx - Viewport-triggered loading
<LazyLoad fallback={<Skeleton />}>
  {(enabled) => <HeavyComponent enabled={enabled} />}
</LazyLoad>
```

#### 5. Clean Component Architecture
Components follow single responsibility:
- `DecisionLensSelector` - Pure lens selection UI
- `LensReadinessCard` - Displays readiness metrics
- `DecisionQuestionHeader` - Handles header + summary integration

### Issues & Anti-Patterns ⚠️

#### 1. Large Hooks Need Splitting
**File:** `src/hooks/use-psychology-snapshot.ts` (518 lines)

This hook has grown to include:
- 4 different query hooks
- 5 parser functions
- Multiple complex type definitions

**Recommendation:** Split into:
- `use-psychology-snapshot-types.ts` - Type definitions
- `use-psychology-snapshot-parsers.ts` - JSONB parsing utilities
- `use-psychology-snapshot.ts` - Main hooks only

#### 2. Inline Glass Card Styles Repeated
**Files:** `Dashboard.tsx`, `SymbolPage.tsx`, multiple components

```typescript
// This pattern appears 15+ times across components
const glassCardClasses = cn(
  "rounded-2xl p-6",
  "bg-white/60 dark:bg-[hsl(0_0%_12%/0.55)]",
  "backdrop-blur-[28px] backdrop-saturate-[140%]",
  // ...
);
```

**Recommendation:** Create reusable `GlassCard` component or Tailwind `@apply` class.

#### 3. Inconsistent Error Handling in Frontend
**Issue:** Some hooks silently catch errors, others throw.

```typescript
// use-stocktwits.ts - Returns empty array on error
catch (error) {
  console.error('Failed to fetch trending:', error);
  return [];
}

// use-decision-lens-summary.ts - Throws error
if (error) {
  console.error('Lens summary error:', error);
  throw error;
}
```

**Recommendation:** Standardize error handling strategy. Use React Query's error boundaries consistently.

#### 4. Hardcoded Demo Routes Without Auth
**File:** `src/App.tsx` (lines 63-68)

```typescript
{/* These routes bypass ProtectedRoute */}
<Route path="/symbol/AAPL" element={<SymbolPage />} />
<Route path="/symbol/NVDA" element={<SymbolPage />} />
<Route path="/symbol/AAPL/messages" element={<MessagesPage />} />
```

**Issue:** Creates inconsistency in auth requirements. Demo symbols should have a separate handling pattern rather than duplicated routes.

**Recommendation:** Use a query parameter (`?demo=true`) or a proper demo mode context.

#### 5. Magic Numbers in Analytics
**File:** `src/lib/stocktwits-api.ts`

```typescript
// Generated sentiment patterns with arbitrary numbers
const baseSentiment = 55 + timeVariation + (volumeRatio * 10);
const sentiment = Math.round(Math.max(20, Math.min(90, baseSentiment)));
```

**Issue:** The narrative/emotion analytics are derived from volume patterns using arbitrary formulas, not real sentiment data.

**Recommendation:** Document these as "synthetic" data clearly, or implement actual sentiment extraction from message content.

#### 6. Missing Test Infrastructure
**Issue:** No test files found. Critical for a financial data platform.

**Recommendation:** Add:
- Unit tests for hooks with MSW mocking
- Component tests for critical UI flows
- E2E tests for auth and main user journeys (Playwright setup exists but no tests)

#### 7. Potential Memory Leak in Context
**File:** `src/contexts/AskDeriveStreetContext.tsx`

```typescript
// Conversation stored in localStorage, but also in state
// If user has 50+ symbols with conversations, this could grow large
all[symbol.toUpperCase()] = conversation.slice(-50);
```

**Recommendation:** Implement LRU cache for conversation history. Consider IndexedDB for larger datasets.

---

## UX/UI Evaluation

### Strengths ✅

1. **Liquid Glass Design System**
   - Consistent glassmorphism aesthetic
   - Dark/light mode with smooth transitions
   - Well-implemented backdrop blur effects

2. **Mobile Responsive**
   - `use-mobile.tsx` hook for breakpoint detection
   - Responsive grid layouts
   - Touch-friendly selector components

3. **Loading States**
   - Route-specific skeletons (`SymbolPageSkeleton`, etc.)
   - Staggered animation groups
   - Proper Suspense boundaries

4. **Keyboard Navigation**
   - Arrow keys navigate Decision Lenses
   - `⌘K` opens search command palette
   - Focus management in modals

### Areas for Improvement 🔧

1. **Accessibility Gaps**
   - Some interactive elements missing `aria-label`
   - Color contrast may be insufficient in glass cards
   - Missing skip-to-content link

2. **Chart Accessibility**
   - Recharts lacks proper screen reader support
   - No keyboard navigation within charts
   - Missing chart descriptions

3. **Error States**
   - `EmptyState` component exists but inconsistently used
   - Some failed data fetches show nothing instead of error UI

---

## Supabase Integration Review

### Schema Design ✅
Well-structured with:
- Proper foreign key relationships (implicit via `user_id`)
- JSONB for flexible snapshot data
- Appropriate indexes (implied by query patterns)

### Auth Flow ✅
```typescript
// AuthContext.tsx - Proper pattern
useEffect(() => {
  // Set up listener FIRST
  const { data: { subscription } } = supabase.auth.onAuthStateChange(...);
  // THEN check existing session
  supabase.auth.getSession().then(...);
  return () => subscription.unsubscribe();
}, []);
```

### Edge Functions ✅
- Good separation of concerns
- Shared utilities (`_shared/logger.ts`, `circuit-breaker.ts`)
- Proper CORS headers
- Error logging to database

### Potential Issues ⚠️

1. **No Row Level Security (RLS) visible**
   - Types don't show RLS policies
   - Ensure policies exist for `watchlists`, `alerts`, `user_custom_lenses`

2. **Cache Cleanup Jobs**
   - `cleanup_stocktwits_cache()` runs randomly (5% of requests)
   - Consider scheduled job for more predictable cleanup

---

## Performance Considerations

### Current Optimizations ✅

1. **Code Splitting** - All pages lazy loaded
2. **Lazy Charts** - `LazyNarrativeChart`, etc.
3. **SWR Caching** - Background refresh with stale data
4. **Image Optimization** - Background images loaded via dynamic import

### Potential Improvements 🚀

1. **Bundle Size**
   - `recharts` is heavy (~200KB). Consider `react-chartjs-2` or Visx
   - `framer-motion` adds ~50KB. Only import needed components

2. **React Query Optimization**
   ```typescript
   // Consider select to reduce re-renders
   useQuery({
     queryKey: ['snapshot', symbol],
     queryFn: fetchSnapshot,
     select: (data) => data.interpretation.snapshot_summary, // Only subscribe to needed data
   });
   ```

3. **Memoization Gaps**
   ```typescript
   // SymbolPage.tsx - Large object recreated each render
   const data = stats || {
     symbol,
     name: symbol,
     // ... default values
   };
   ```
   Use `useMemo` for default value objects.

4. **Font Loading**
   - Inter and JetBrains Mono loaded via HTML
   - Consider `font-display: swap` and preconnect hints

---

## Suggested Improvements (Prioritized)

### P0 - Critical 🔴

1. **Add Test Coverage**
   - Set up Vitest + Testing Library
   - Cover critical paths: auth flow, lens selection, data fetching
   - Add Playwright E2E for signup/login

2. **Standardize Error Handling**
   - Create error boundary wrapper for all pages
   - Implement consistent toast notifications for API failures
   - Add retry UI for transient failures

### P1 - High Priority 🟠

3. **Refactor Large Hooks**
   - Split `use-psychology-snapshot.ts` into focused modules
   - Split `use-emotion-momentum.ts` (355 lines)
   - Extract reusable logic into shared utilities

4. **Create Design System Components**
   - `<GlassCard>` component replacing inline classes
   - `<MetricTile>` for consistent metric display
   - `<DataEmpty>` and `<DataError>` state components

5. **Accessibility Audit**
   - Add ARIA labels to all interactive elements
   - Test with screen reader
   - Ensure WCAG 2.1 AA compliance

### P2 - Medium Priority 🟡

6. **Performance Monitoring**
   - Integrate Sentry or similar for frontend errors
   - Add Core Web Vitals tracking
   - Monitor bundle size in CI

7. **Documentation**
   - Add JSDoc to exported functions/hooks
   - Create component Storybook
   - Document Decision Lens prompt engineering

8. **Demo Mode Refactor**
   - Replace hardcoded demo routes with query param pattern
   - Create `DemoContext` for consistent demo data

### P3 - Nice to Have 🟢

9. **Bundle Optimization**
   - Analyze bundle with `vite-bundle-visualizer`
   - Tree-shake Framer Motion imports
   - Consider lighter charting library

10. **Progressive Enhancement**
    - Add service worker for offline support
    - Implement optimistic updates for watchlist changes
    - Add real-time subscriptions for live sentiment

---

## Feature Ideas

Based on the app's architecture and apparent goals, here are feature ideas that could add value:

### Analytics Enhancements

1. **Cross-Symbol Correlation Dashboard**
   - Show when narratives spread across related stocks
   - Identify sector-wide sentiment shifts
   - "Contagion detection" for fear/euphoria spread

2. **Backtest Lens Predictions**
   - Track how lens confidence correlates with outcomes
   - Build historical accuracy metrics
   - Allow users to filter by confidence threshold

3. **Earnings Calendar Integration**
   - Pre/post earnings sentiment comparison
   - Auto-generate "Earnings Lens" analysis before reports
   - Track sentiment drift into earnings

### User Experience

4. **Collaborative Workspaces**
   - Shared watchlists for teams
   - Annotation system for psychology snapshots
   - Export reports as PDF/slides

5. **Alert Intelligence**
   - "Smart alerts" that trigger on narrative shifts
   - Velocity-based alerts (rapid sentiment change)
   - Multi-symbol correlation alerts

6. **Mobile App (PWA)**
   - Push notifications for alerts
   - Quick-glance watchlist widget
   - Voice-powered "Ask DeriveStreet"

### AI Enhancements

7. **Lens Auto-Selection**
   - AI suggests most relevant lens based on current discussions
   - "Trending lenses" showing which perspectives are most active

8. **Narrative Timeline**
   - Visual timeline of narrative evolution
   - Key inflection points highlighted
   - Compare to price action overlay

9. **Source Credibility Scoring**
   - Weight messages by user's historical accuracy
   - Identify and flag bot accounts
   - Premium weight for verified traders

---

## Conclusion

DeriveStreet is a well-architected application with sophisticated features for institutional sentiment analysis. The codebase shows strong engineering practices in caching, data flow, and component architecture. The main areas for improvement are testing infrastructure, standardized error handling, and refactoring some oversized hooks.

The Decision Lens framework is a compelling differentiator that could benefit from additional lenses and historical backtesting. With the suggested improvements implemented, this platform would be production-ready for institutional deployment.

**Recommended Next Steps:**
1. Set up Vitest and add tests for critical paths
2. Implement standardized error handling with user-facing feedback
3. Refactor `use-psychology-snapshot.ts` as a template for other large hooks
4. Create `GlassCard` and other design system components
5. Run accessibility audit and fix critical issues

---

*Review generated by AI Code Review Agent*
