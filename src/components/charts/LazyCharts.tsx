import { lazy, Suspense, ComponentType } from 'react';
import { ChartSkeleton } from './ChartSkeleton';

// Lazy load heavy chart components with named export transformation
export const LazyNarrativeChart = lazy(() => 
  import('./NarrativeChart').then(m => ({ default: m.NarrativeChart }))
);
export const LazyEmotionChart = lazy(() => 
  import('./EmotionChart').then(m => ({ default: m.EmotionChart }))
);
export const LazySentimentChart = lazy(() => 
  import('./SentimentChart').then(m => ({ default: m.SentimentChart }))
);
export const LazyEmotionMomentumChart = lazy(() => 
  import('./EmotionMomentumChart').then(m => ({ default: m.EmotionMomentumChart }))
);

// Chart variant types
type ChartVariant = 'bar' | 'line' | 'stacked';

interface ChartWithSuspenseProps {
  Chart: React.LazyExoticComponent<ComponentType<any>>;
  variant?: ChartVariant;
  [key: string]: any;
}

/**
 * Wrapper component that provides Suspense boundary with chart-specific skeleton fallback.
 * Use this when you need a custom skeleton variant for the lazy-loaded chart.
 */
export function ChartWithSuspense({ 
  Chart, 
  variant = 'stacked',
  ...props 
}: ChartWithSuspenseProps) {
  return (
    <Suspense fallback={<ChartSkeleton variant={variant} />}>
      <Chart {...props} />
    </Suspense>
  );
}
