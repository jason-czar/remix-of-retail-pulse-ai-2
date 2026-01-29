
# Symbol Page Performance Optimization: Tabbed Data Loading Strategy

## Overview

This plan implements a comprehensive lazy-loading strategy to reduce the data waterfall on `SymbolPage`. Currently, ~15+ queries fire simultaneously on every page load and lens switch, regardless of what the user actually needs to see.

---

## Current Problem Analysis

### Queries Firing on Every Page Load

| Query | Component | Always Needed? |
|-------|-----------|----------------|
| `useSymbolStats` | SymbolPage, SummaryInsightsCard, PsychologyOverviewCard | **Yes** - header data |
| `useSymbolMessages` | SymbolPage → MessagesSidebar | **Yes** - sidebar |
| `useDecisionLensSummary` | SymbolPage | Only for active lens |
| `useLatestPsychologySnapshot` | PsychologyOverviewCard, NarrativeCoherenceCard, LensReadinessCard | Only on Summary lens |
| `useSentimentHistory` | SummaryInsightsCard, PsychologyOverviewCard | Only on Summary lens |
| `useNCSHistory` | NCSTrendChart | Only when collapsible opened |
| `useHistoricalEpisodeMatcher` | HistoricalEpisodeMatcher | Visible but below fold |
| `useLatestSnapshotWithOutcomes` | NarrativeImpactHistorySection | Visible but below fold |
| Chart data (narrative/emotion/sentiment history) | NarrativeChart, EmotionChart, SentimentChart | Only for active chart tab |
| Stock price data | Charts | Only for active chart tab |
| Volume analytics | NarrativeChart | Only for narratives tab |

### Key Issues
1. **Summary lens** loads data for non-summary lenses
2. **Non-summary lenses** load chart data unnecessarily
3. **Collapsible sections** fetch data even when closed
4. **All chart tabs** fetch data even when inactive
5. **Duplicate queries** - `useSymbolStats` called 3x, `useLatestPsychologySnapshot` called 3x

---

## Implementation Strategy

### Phase 1: Lens-Aware Data Loading

**Principle**: Only fetch data relevant to the currently active lens.

```text
┌─────────────────────────────────────────────────────────────┐
│                     SYMBOL PAGE                              │
├─────────────────────────────────────────────────────────────┤
│ ALWAYS FETCH:                                               │
│  • Symbol Stats (useSymbolStats)                            │
│  • Messages (useSymbolMessages)                             │
│  • Decision Lens Summary (for current lens only)            │
├─────────────────────────────────────────────────────────────┤
│ SUMMARY LENS ONLY:                                          │
│  • Charts (based on active tab)                             │
│  • Psychology Snapshot (useLatestPsychologySnapshot)        │
│  • Sentiment History (useSentimentHistory)                  │
├─────────────────────────────────────────────────────────────┤
│ NON-SUMMARY LENSES:                                         │
│  • LensReadinessCard data (useLatestPsychologySnapshot)     │
│  • (Charts NOT loaded - they're hidden)                     │
└─────────────────────────────────────────────────────────────┘
```

#### Changes Required

**1. Modify hooks to accept `enabled` flag**

Update `PsychologyOverviewCard`:
```tsx
// Pass isEnabled based on whether we're on summary lens
export function PsychologyOverviewCard({ 
  symbol, 
  hideMetricTiles = false,
  enabled = true  // NEW PROP
}: PsychologyOverviewCardProps) {
  const { data: snapshot, isLoading } = useLatestPsychologySnapshot(symbol, enabled);
  const { data: symbolStats } = useSymbolStats(symbol); // Always needed
  const { data: sentimentHistory } = useSentimentHistory(symbol, 7, enabled);
  // ...
}
```

**2. Update SymbolPage to pass enabled flags**

```tsx
// Only load Summary lens specific data when on summary
const isSummaryLens = decisionLens === 'summary';

// Charts section already conditionally renders, but hooks inside still fire
// We need to prevent the hooks from running when not on summary
```

---

### Phase 2: Chart Tab Lazy Loading

**Principle**: Only fetch data for the active chart tab.

#### Current Problem
All 4 chart components mount when summary lens is active, and each fires its own queries:

- `NarrativeChart`: useNarrativeHistory, useVolumeAnalytics, useStockPrice
- `EmotionChart`: useEmotionHistory, useStockPrice  
- `SentimentChart`: useSentimentAnalytics
- `EmotionMomentumChart`: useEmotionMomentum

#### Solution: Add `enabled` prop to chart hooks

**1. Modify chart hooks** (`use-narrative-history.ts`, `use-emotion-history.ts`, etc.):

```tsx
export function useNarrativeHistory(
  symbol: string,
  options?: { 
    periodType?: 'hourly' | 'daily';
    limit?: number;
    start?: string;
    end?: string;
    enabled?: boolean;  // NEW
  }
) {
  return useQuery({
    // ...
    enabled: options?.enabled !== false && !!symbol,
  });
}
```

**2. Update SymbolPage to track active tab and pass to charts**:

```tsx
// In chart rendering section:
<TabsContent value="narratives" className="mt-0 mb-1.5 md:mb-2">
  <div className="-mx-4 md:mx-0">
    <NarrativeChart 
      symbol={symbol} 
      timeRange={timeRange} 
      start={start} 
      end={end}
      enabled={activeTab === 'narratives'}  // Only fetch when active
    />
  </div>
</TabsContent>
```

**3. Update chart components to accept `enabled` prop**:

```tsx
interface NarrativeChartProps {
  symbol: string;
  timeRange?: TimeRange;
  start?: string;
  end?: string;
  enabled?: boolean;  // NEW
}

export function NarrativeChart({ 
  symbol, 
  timeRange = '1D', 
  start, 
  end,
  enabled = true 
}: NarrativeChartProps) {
  const { data: narrativeHistory } = useNarrativeHistory(symbol, {
    // ...
    enabled,
  });
  // Pass enabled to all hooks...
}
```

---

### Phase 3: Collapsible Section Lazy Loading

**Principle**: Only fetch data when collapsible is opened.

#### Target Components
1. **Narrative Coherence** section (contains `NarrativeCoherenceCard` + `NCSTrendChart`)

#### Solution: State-based enabled flag

```tsx
// In SymbolPage.tsx - replace defaultOpen={false} with controlled state
const [ncsOpen, setNcsOpen] = useState(false);

<Collapsible open={ncsOpen} onOpenChange={setNcsOpen} className="mb-8 md:mb-12 mt-12 md:mt-16">
  <CollapsibleTrigger>
    {/* ... */}
  </CollapsibleTrigger>
  <CollapsibleContent className="pt-4">
    {/* Only render children when opened, or pass enabled flag */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <NarrativeCoherenceCard symbol={symbol} enabled={ncsOpen} />
      <NCSTrendChart symbol={symbol} enabled={ncsOpen} />
    </div>
  </CollapsibleContent>
</Collapsible>
```

Update components to accept `enabled`:
```tsx
// NarrativeCoherenceCard.tsx
export function NarrativeCoherenceCard({ symbol, enabled = true }: Props) {
  const { data: snapshot, isLoading } = useLatestPsychologySnapshot(symbol, enabled);
  // ...
}

// NCSTrendChart.tsx  
export function NCSTrendChart({ symbol, enabled = true }: Props) {
  const { data: ncsData, isLoading } = useNCSHistory(symbol, range, enabled);
  // ...
}
```

---

### Phase 4: Viewport-Based Loading (Intersection Observer)

**Principle**: Defer loading components that are below the initial viewport.

#### Target Components
- `HistoricalEpisodeMatcher` 
- `NarrativeImpactHistorySection`

#### Solution: Create a reusable `LazyLoad` wrapper

```tsx
// src/components/ui/LazyLoad.tsx
import { useInView } from 'react-intersection-observer';
import { useState, useEffect, ReactNode } from 'react';

interface LazyLoadProps {
  children: (enabled: boolean) => ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
}

export function LazyLoad({ 
  children, 
  fallback = null,
  threshold = 0.1,
  rootMargin = '100px'  // Start loading 100px before entering viewport
}: LazyLoadProps) {
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const { ref, inView } = useInView({
    threshold,
    rootMargin,
    triggerOnce: true,  // Only trigger once
  });

  useEffect(() => {
    if (inView) {
      setHasBeenVisible(true);
    }
  }, [inView]);

  return (
    <div ref={ref}>
      {hasBeenVisible ? children(true) : fallback}
    </div>
  );
}
```

**Usage in SymbolPage**:

```tsx
import { LazyLoad } from '@/components/ui/LazyLoad';

{/* Historical Episode Matcher - lazy loaded */}
<LazyLoad 
  fallback={
    <div className="mb-8 md:mb-12">
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  }
>
  {(enabled) => (
    <div className="mb-8 md:mb-12">
      <HistoricalEpisodeMatcher symbol={symbol} enabled={enabled} />
    </div>
  )}
</LazyLoad>

{/* Narrative Impact History - lazy loaded */}
<LazyLoad 
  fallback={
    <div className="mb-8 md:mb-12">
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  }
>
  {(enabled) => (
    <div className="mb-8 md:mb-12">
      <NarrativeImpactHistorySection symbol={symbol} enabled={enabled} />
    </div>
  )}
</LazyLoad>
```

---

### Phase 5: Eliminate Duplicate Queries

**Problem**: Same hooks called multiple times across components:
- `useSymbolStats`: SymbolPage, SummaryInsightsCard, PsychologyOverviewCard
- `useLatestPsychologySnapshot`: PsychologyOverviewCard, NarrativeCoherenceCard, LensReadinessCard

**Solution**: React Query's deduplication handles this automatically - queries with the same key only fire once. However, we should verify the query keys are identical and consider:

1. **Lift data up** where practical (pass snapshot data as props instead of re-fetching)
2. **Ensure consistent query keys** (already handled by the hooks)

---

## Files to Modify

### Core Implementation Files

| File | Changes |
|------|---------|
| `src/pages/SymbolPage.tsx` | Add lens-aware loading, chart tab enabled flags, collapsible state management, LazyLoad wrappers |
| `src/components/ui/LazyLoad.tsx` | **NEW FILE** - Intersection Observer wrapper |
| `src/components/PsychologyOverviewCard.tsx` | Add `enabled` prop to control hook execution |
| `src/components/SummaryInsightsCard.tsx` | Add `enabled` prop (optional - inherits from parent) |
| `src/components/charts/NarrativeChart.tsx` | Add `enabled` prop, pass to all hooks |
| `src/components/charts/EmotionChart.tsx` | Add `enabled` prop, pass to all hooks |
| `src/components/charts/SentimentChart.tsx` | Add `enabled` prop, pass to hooks |
| `src/components/charts/EmotionMomentumChart.tsx` | Add `enabled` prop, pass to hooks |
| `src/components/NarrativeCoherenceCard.tsx` | Add `enabled` prop |
| `src/components/NCSTrendChart.tsx` | Add `enabled` prop |
| `src/components/HistoricalEpisodeMatcher.tsx` | Add `enabled` prop |
| `src/components/NarrativeImpactHistorySection.tsx` | Add `enabled` prop |
| `src/components/LensReadinessCard.tsx` | Add `enabled` prop |

### Hook Modifications

| File | Changes |
|------|---------|
| `src/hooks/use-narrative-history.ts` | Add `enabled` option |
| `src/hooks/use-emotion-history.ts` | Add `enabled` option |
| `src/hooks/use-sentiment-history.ts` | Verify `enabled` support |
| `src/hooks/use-ncs-history.ts` | Add `enabled` parameter |
| `src/hooks/use-historical-episode-matcher.ts` | Verify `enabled` support |

---

## Dependencies

Need to install `react-intersection-observer` for viewport-based loading:
```bash
npm install react-intersection-observer
```

---

## Expected Impact

### Before Optimization
- **Initial page load**: ~15+ parallel queries
- **Lens switch**: Re-fetches chart data unnecessarily
- **Time to interactive**: Delayed by low-priority data

### After Optimization
- **Summary lens initial load**: ~6 queries (stats, messages, lens summary, psychology snapshot, sentiment history, active chart data)
- **Non-summary lens load**: ~4 queries (stats, messages, lens summary, readiness data)
- **Collapsible sections**: 0 queries until opened
- **Below-fold components**: Deferred until scrolled into view

### Estimated Performance Improvement
- **40-60% reduction** in initial query count
- **Faster First Contentful Paint** on mobile
- **Reduced backend load** for casual browsing
- **Better perceived performance** with progressive loading

---

## Technical Notes

1. **React Query Caching**: Cached data persists across lens switches - users returning to Summary lens won't re-fetch chart data within the stale time window.

2. **Skeleton Consistency**: All lazy-loaded sections should show appropriate skeleton states to prevent layout shift.

3. **Error Boundaries**: Existing error boundaries remain intact - lazy loading doesn't affect error handling.

4. **State Preservation**: Chart selections (active tab, time range, session) persist in URL query params, so returning to Summary lens restores the user's preferences.
