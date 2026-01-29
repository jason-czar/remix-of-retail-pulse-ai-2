
# Fix Data Coverage Ingestion - COMPLETED ✓

## Summary

Fixed the "Fetch Messages" and "Re-fetch All Data" buttons so they correctly update coverage status.

## Changes Made

### 1. Database Migration ✓
Added unique constraint on `sentiment_history(symbol, recorded_at)` to enable UPSERT.

### 2. Updated `auto-backfill-gaps` Edge Function ✓

**Key changes:**
- Added `type` parameter (`'messages' | 'analytics' | 'all'`) - default: `'all'`
- Added `force` parameter to bypass existing data checks
- Added `computeSentimentFromMessages()` helper to aggregate sentiment
- Added `hasSentimentData()` - checks `sentiment_history` for messages coverage
- Added `hasAnalyticsData()` - checks `narrative_history` for analytics coverage
- Uses end-of-day timestamp (`23:59:59.999Z`) consistent with other history tables
- Uses UPSERT for `sentiment_history` to avoid duplicates

**Flow by type:**
| Type | Tables Written | Checks |
|------|----------------|--------|
| `messages` | `sentiment_history` | `sentiment_history` |
| `analytics` | `narrative_history`, `emotion_history` | `narrative_history` |
| `all` | All three tables | Both |

### 3. Updated `use-data-coverage.ts` Hook ✓
- Now passes `force: true` when `type === 'all'` ("Re-fetch All Data")

## Result

| Action | Data Written | Coverage Result |
|--------|--------------|-----------------|
| **Fetch Messages** | `sentiment_history` | Green dot for Messages |
| **Generate Analytics** | `narrative_history` + `emotion_history` | Green dot for Analytics |
| **Re-fetch All Data** | All three tables (with force) | Green dots for All |
