
# Data Coverage Feature - Final Implementation Plan

## Overview

Add a **Data Coverage** tab to the admin Monitoring page (`/monitoring`) with a calendar-based visualization of data ingestion status per symbol. Administrators can identify gaps and trigger ingestion for missing dates.

## Database Schema

Minimal schema with only essential columns:

```sql
CREATE TABLE public.symbol_daily_coverage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  has_messages BOOLEAN NOT NULL DEFAULT false,
  has_analytics BOOLEAN NOT NULL DEFAULT false,
  message_count INTEGER DEFAULT 0,
  ingestion_status TEXT DEFAULT NULL, -- queued | running | completed | failed
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(symbol, date)
);

CREATE INDEX idx_coverage_symbol_date ON public.symbol_daily_coverage(symbol, date);

-- RLS: public read access
ALTER TABLE public.symbol_daily_coverage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.symbol_daily_coverage FOR SELECT USING (true);
CREATE POLICY "Allow service role write" ON public.symbol_daily_coverage FOR ALL USING (true);
```

## Coverage State Logic

Simple, clear coloring rules per filter:

| Filter | Green | Amber | Gray |
|--------|-------|-------|------|
| **Messages** | has_messages = true | - | has_messages = false |
| **Analytics** | has_analytics = true | has_messages = true AND has_analytics = false | both false |
| **All** | has_messages AND has_analytics | has_messages XOR has_analytics | neither |

## Architecture

```text
MonitoringPage
├── Tabs: Overview | Performance | Errors | Cache | Coverage
│                                                    │
│                                        ┌───────────▼───────────┐
│                                        │   DataCoverageTab     │
│                                        └───────────┬───────────┘
│                              ┌─────────────────────┼─────────────────────┐
│                              │                     │                     │
│                      ┌───────▼────────┐    ┌──────▼──────┐    ┌────────▼────────┐
│                      │  ControlsRow   │    │CoverageGrid │    │ DayDetailSheet  │
│                      │ - Symbol Input │    │ - Month View│    │ - Status Cards  │
│                      │ - Data Type    │    │ - Day Cells │    │ - Fetch Actions │
│                      │ - Month Nav    │    └─────────────┘    └─────────────────┘
│                      └────────────────┘
└────────────────────────────────────────────────────────────────────────────────────
```

## Components

### 1. DataCoverageTab
Main orchestrator component:
- **Symbol Input**: Text input with uppercase formatting (existing pattern)
- **Data Type Select**: Messages | Analytics | All
- **Month Navigation**: Previous/Next arrows with month/year display
- **Refresh Button**: Re-fetches coverage data

### 2. CoverageCalendar
Month grid with minimal cell density:
- Standard 7-column weekday layout (Sun-Sat)
- Day cells show only:
  - Day number
  - Small colored dot indicator (Green/Amber/Gray)
- **Future dates**: Muted appearance, non-clickable, no hover effects
- **Past/present dates**: Clickable to open detail sheet
- Hover tooltip shows: Date, Messages status, Analytics status

### 3. DayCoverageCell
Individual cell component:
- Day number centered
- 6px colored dot below number
- Disabled state for future dates
- Loading spinner overlay when ingestion running

### 4. DayDetailSheet
Slide-out sheet (right side) containing:
- **Header**: Symbol + formatted date
- **Status Cards**:
  - Messages: count or "No data"
  - Analytics: "Computed" or "Missing"
- **Ingestion Status Badge**: queued/running/completed/failed (when applicable)
- **Actions** (disabled for future dates):
  - "Fetch Messages" - triggers stocktwits fetch + sentiment
  - "Generate Analytics" - triggers narrative/emotion analysis
  - "Re-fetch All Data" - runs full pipeline

## Hook: use-data-coverage.ts

```typescript
interface DayCoverage {
  date: string;
  hasMessages: boolean;
  hasAnalytics: boolean;
  messageCount: number;
  ingestionStatus: 'queued' | 'running' | 'completed' | 'failed' | null;
}

// Single query per symbol/month with 5-min client-side cache
export function useMonthCoverage(symbol: string, year: number, month: number) {
  return useQuery({
    queryKey: ['coverage', symbol, year, month],
    queryFn: async () => {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const { data } = await supabase
        .from('symbol_daily_coverage')
        .select('*')
        .eq('symbol', symbol)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);
      
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    enabled: !!symbol,
  });
}

export function useTriggerIngestion() {
  return useMutation({
    mutationFn: async ({ symbol, date, type }: { 
      symbol: string; 
      date: string; 
      type: 'messages' | 'analytics' | 'all' 
    }) => {
      // Update status to 'queued'
      // Trigger appropriate edge function
      // Update status to 'running' -> 'completed'/'failed'
    }
  });
}
```

## Edge Function: compute-coverage-status

Recalculates coverage by checking data existence:

```typescript
// POST /compute-coverage-status
// Body: { symbol: string, dates?: string[] }
// Default: recalculates last 30 days (not 90)

// Coverage logic:
// has_messages = sentiment_history records exist for date
// has_analytics = narrative_history OR emotion_history records exist for date
// message_count = sum of message_count from sentiment_history
```

## Integration with Existing Functions

Ingestion actions will call existing functions:

| Action | Function Called | Parameters |
|--------|-----------------|------------|
| Fetch Messages | `auto-backfill-gaps` | `{ symbol, startDate: date, endDate: date }` |
| Generate Analytics | `auto-backfill-gaps` | `{ symbol, startDate: date, endDate: date }` |
| Re-fetch All | `auto-backfill-gaps` + refresh | Full pipeline for date |

## File Structure

```
src/
├── components/
│   └── monitoring/
│       ├── DataCoverageTab.tsx      # Main container
│       ├── CoverageCalendar.tsx     # Month grid
│       ├── DayCoverageCell.tsx      # Individual cell
│       └── DayDetailSheet.tsx       # Detail panel
├── hooks/
│   └── use-data-coverage.ts         # Coverage hooks
└── pages/
    └── MonitoringPage.tsx           # Add Coverage tab

supabase/
└── functions/
    └── compute-coverage-status/
        └── index.ts
```

## Implementation Steps

1. **Database**: Create `symbol_daily_coverage` table with migration
2. **Edge Function**: Build `compute-coverage-status` with 30-day default
3. **Hook**: Implement `use-data-coverage` with caching
4. **Components**: Build DataCoverageTab, CoverageCalendar, DayCoverageCell, DayDetailSheet
5. **Integration**: Add Coverage tab to MonitoringPage TabsList
6. **Actions**: Wire ingestion buttons to existing backfill functions

## Phase 1 Scope (Locked)

**Included:**
- Coverage table with minimal schema
- Calendar visualization with simple coloring
- Single-day ingestion triggers
- Detail sheet with status and actions
- Coverage refresh functionality

**Deferred to Phase 2:**
- Shift-click range selection
- Batch fetch operations
- Full job history panel
- Automated scheduling
- Export/reporting
