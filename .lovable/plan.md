
# Fix Data Coverage Ingestion - Implementation Plan

## Overview

Fix the "Fetch Messages" and "Re-fetch All Data" buttons so they correctly update coverage status. The core issues are:
1. `type` parameter is ignored in `auto-backfill-gaps`
2. Messages are never stored in `sentiment_history`
3. Wrong tables checked for existing data

## Changes

### 1. Database Migration

Add unique constraint on `sentiment_history` to enable proper UPSERT:

```sql
ALTER TABLE public.sentiment_history 
ADD CONSTRAINT sentiment_history_symbol_recorded_unique 
UNIQUE (symbol, recorded_at);
```

### 2. Update `auto-backfill-gaps` Edge Function

**File:** `supabase/functions/auto-backfill-gaps/index.ts`

#### a) Accept New Parameters
- `type`: 'messages' | 'analytics' | 'all' (default: 'all')
- `force`: boolean to bypass existing data checks

#### b) Add Sentiment Computation Helper
```typescript
function computeSentimentFromMessages(messages: StocktwitsMessage[]): {
  sentimentScore: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
}
```

#### c) Check Correct Tables Based on Type
- `type='messages'` → check `sentiment_history`
- `type='analytics'` → check `narrative_history`
- `type='all'` → check both

#### d) Store Sentiment Data with UPSERT
Use consistent timestamp alignment (end of trading day for the target date, matching existing patterns in the codebase):

```typescript
// Use end-of-day timestamp consistent with other history tables
const recordedAt = new Date(`${dateStr}T00:00:00Z`);
recordedAt.setUTCHours(23, 59, 59, 999);

await supabase
  .from('sentiment_history')
  .upsert({
    symbol: symbol.toUpperCase(),
    recorded_at: recordedAt.toISOString(),
    sentiment_score: sentimentScore,
    bullish_count: bullishCount,
    bearish_count: bearishCount,
    neutral_count: neutralCount,
    message_volume: messages.length,
  }, { onConflict: 'symbol,recorded_at' });
```

#### e) Conditional Flow
- `type='messages'`: Fetch messages → compute sentiment → store in `sentiment_history`
- `type='analytics'`: Fetch messages → run AI analysis → store in `narrative_history` + `emotion_history`
- `type='all'`: Fetch messages once → do both flows

### 3. Update `use-data-coverage.ts` Hook

**File:** `src/hooks/use-data-coverage.ts`

Pass `force: true` when "Re-fetch All Data" is clicked:

```typescript
const { error: backfillError } = await supabase.functions.invoke('auto-backfill-gaps', {
  body: {
    symbol,
    startDate: date,
    endDate: date,
    type,
    force: type === 'all',
  },
});
```

## Technical Details

### Timestamp Alignment

Looking at existing code patterns in `auto-backfill-gaps`, the function already uses end-of-day timestamps for narrative/emotion history. The sentiment data will follow the same pattern to ensure consistency when `compute-coverage-status` checks for data presence.

### Data Flow After Fix

| Action | Tables Updated | Coverage Result |
|--------|----------------|-----------------|
| Fetch Messages | `sentiment_history` | hasMessages = true |
| Generate Analytics | `narrative_history`, `emotion_history` | hasAnalytics = true |
| Re-fetch All | All three tables | Both = true |

## Implementation Steps

1. Create migration for unique constraint on `sentiment_history`
2. Update `auto-backfill-gaps` edge function with type/force handling
3. Update `use-data-coverage.ts` hook to pass force parameter
4. Deploy and test

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/auto-backfill-gaps/index.ts` | Add type/force params, sentiment computation, correct table checks |
| `src/hooks/use-data-coverage.ts` | Pass force=true for "Re-fetch All" |
| New migration | Add unique constraint on sentiment_history |
