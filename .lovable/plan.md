
# Phase 3: Frontend Performance Improvements

A comprehensive set of optimizations focused on code splitting, lazy loading, resource hints, and bundle optimization to improve First Contentful Paint (FCP), Largest Contentful Paint (LCP), and Time to Interactive (TTI).

---

## Summary

This plan addresses frontend performance gaps through four key areas:

1. **Enhanced Resource Hints** - Preconnect to upstream APIs, preload critical fonts/assets
2. **Component-Level Code Splitting** - Lazy load heavy chart components and AI chat panel
3. **Image Optimization** - Implement responsive images with srcset and lazy loading
4. **Bundle Refinement** - Extend manual chunks, add dynamic imports for landing page sections

Estimated implementation time: 3-4 hours
Risk level: Low (additive changes with graceful fallbacks)

---

## Current State Analysis

### What's Already Implemented
| Pattern | Implementation |
|---------|---------------|
| Route-level splitting | All pages except landing use `React.lazy()` |
| Viewport lazy loading | `LazyLoad` component for below-fold sections |
| Manual vendor chunks | Recharts, Framer Motion, Radix UI separated |
| Data prefetching | Decision lens prefetch after 500ms |
| Image preloading | Landing backgrounds loaded via dynamic import |
| Supabase preconnect | `<link rel="preconnect">` in index.html |

### Identified Gaps
| Issue | Impact |
|-------|--------|
| No preconnect to StockTwits/Yahoo Finance | First API call adds DNS+TLS latency |
| Chart components statically imported | NarrativeChart (2252 lines) loaded with SymbolPage even when not visible |
| AskDeriveStreetPanel always bundled | 460 lines + context bundled on every page |
| Landing sections not lazy loaded | All 7 sections render synchronously on `/` |
| No font preloading | Font files discovered late in waterfall |
| No Supabase JS chunk | @supabase/supabase-js not in manual chunks |

---

## 1. Enhanced Resource Hints

### Add Preconnects for Upstream APIs

Update `index.html` to establish early connections to external services:

```html
<!-- Existing -->
<link rel="preconnect" href="https://hteqootlqamsvkqgdtjw.supabase.co" crossorigin />
<link rel="dns-prefetch" href="https://hteqootlqamsvkqgdtjw.supabase.co" />

<!-- NEW: StockTwits proxy (via Supabase Edge Functions) -->
<link rel="preconnect" href="https://hteqootlqamsvkqgdtjw.supabase.co" crossorigin />

<!-- NEW: Preload system font for faster text rendering -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin />
```

**Why**: Early connection establishment shaves 100-300ms off first API call.

---

## 2. Component-Level Code Splitting

### Lazy Load Chart Components

Create lazy wrapper for heavy chart components that are conditionally rendered based on active tab:

**Create: `src/components/charts/LazyCharts.tsx`**

```typescript
import { lazy, Suspense } from 'react';
import { ChartSkeleton } from './ChartSkeleton';

// Lazy load heavy chart components
export const LazyNarrativeChart = lazy(() => import('./NarrativeChart').then(m => ({ default: m.NarrativeChart })));
export const LazyEmotionChart = lazy(() => import('./EmotionChart').then(m => ({ default: m.EmotionChart })));
export const LazySentimentChart = lazy(() => import('./SentimentChart').then(m => ({ default: m.SentimentChart })));
export const LazyEmotionMomentumChart = lazy(() => import('./EmotionMomentumChart').then(m => ({ default: m.EmotionMomentumChart })));

// Wrapper with skeleton fallback
export function ChartWithSuspense({ 
  Chart, 
  variant = 'stacked',
  ...props 
}: { 
  Chart: React.LazyExoticComponent<any>;
  variant?: 'bar' | 'line' | 'stacked';
  [key: string]: any;
}) {
  return (
    <Suspense fallback={<ChartSkeleton variant={variant} />}>
      <Chart {...props} />
    </Suspense>
  );
}
```

**Update: `src/pages/SymbolPage.tsx`**

Replace static imports with lazy variants:

```typescript
// Before
import { NarrativeChart } from "@/components/charts/NarrativeChart";
import { EmotionChart } from "@/components/charts/EmotionChart";
import { SentimentChart } from "@/components/charts/SentimentChart";
import { EmotionMomentumChart } from "@/components/charts/EmotionMomentumChart";

// After
import { 
  LazyNarrativeChart, 
  LazyEmotionChart, 
  LazySentimentChart,
  LazyEmotionMomentumChart,
  ChartWithSuspense 
} from "@/components/charts/LazyCharts";
```

### Lazy Load Ask Panel

Move the `AskDeriveStreetPanel` to a lazy-loaded module since it's only rendered when explicitly opened:

**Update: `src/pages/SymbolPage.tsx`**

```typescript
// Create lazy component
const LazyAskPanel = lazy(() => import('@/components/ask/AskDeriveStreetPanel').then(m => ({ default: m.AskDeriveStreetPanel })));

// In render:
{isAskPanelOpen && (
  <Suspense fallback={null}>
    <LazyAskPanel />
  </Suspense>
)}
```

---

## 3. Landing Page Section Lazy Loading

### Implement Progressive Loading for Below-Fold Sections

The landing page currently renders all 7 sections synchronously. Lazy load below-fold sections for faster initial paint:

**Update: `src/pages/Index.tsx`**

```typescript
import { lazy, Suspense } from "react";
import { LazyLoad } from "@/components/ui/LazyLoad";

// Above-fold sections (keep synchronous)
import { HeroSection } from "@/components/landing/HeroSection";

// Below-fold sections (lazy load)
const ProblemSection = lazy(() => import("@/components/landing/ProblemSection").then(m => ({ default: m.ProblemSection })));
const SolutionSection = lazy(() => import("@/components/landing/SolutionSection").then(m => ({ default: m.SolutionSection })));
const AudienceSection = lazy(() => import("@/components/landing/AudienceSection").then(m => ({ default: m.AudienceSection })));
const HowItWorksSection = lazy(() => import("@/components/landing/HowItWorksSection").then(m => ({ default: m.HowItWorksSection })));
const IntelligencePatternsSection = lazy(() => import("@/components/landing/IntelligencePatternsSection").then(m => ({ default: m.IntelligencePatternsSection })));
const CredibilitySection = lazy(() => import("@/components/landing/CredibilitySection").then(m => ({ default: m.CredibilitySection })));
const FinalCTASection = lazy(() => import("@/components/landing/FinalCTASection").then(m => ({ default: m.FinalCTASection })));

// Section fallback component
function SectionSkeleton({ height = "400px" }: { height?: string }) {
  return <div className="w-full animate-pulse bg-muted/20" style={{ height }} />;
}

// In render:
<main>
  <HeroSection />
  <Suspense fallback={<SectionSkeleton />}>
    <ProblemSection />
  </Suspense>
  <Suspense fallback={<SectionSkeleton />}>
    <SolutionSection />
  </Suspense>
  {/* ... etc */}
</main>
```

---

## 4. Vite Bundle Optimization

### Extend Manual Chunks Configuration

**Update: `vite.config.ts`**

```typescript
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-charts': ['recharts'],
  'vendor-radix': [
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-tabs',
    '@radix-ui/react-tooltip',
    '@radix-ui/react-popover',
    '@radix-ui/react-select',
    '@radix-ui/react-scroll-area',  // NEW
    '@radix-ui/react-collapsible',   // NEW
  ],
  'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
  'vendor-motion': ['framer-motion'],
  'vendor-supabase': ['@supabase/supabase-js'],  // NEW
  'vendor-query': ['@tanstack/react-query'],      // NEW
  'vendor-markdown': ['react-markdown', 'remark-gfm'],  // NEW (used in Ask panel)
},
```

**Why**: 
- `@supabase/supabase-js` is ~150KB and used on every authenticated page
- `@tanstack/react-query` is core infrastructure that rarely changes
- `react-markdown` is only used in the Ask panel - isolating improves cache efficiency

---

## 5. Image Optimization

### Implement Responsive Image Component

**Create: `src/components/ui/OptimizedImage.tsx`**

```typescript
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  aspectRatio?: string;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/placeholder.svg',
  aspectRatio,
  priority = false,
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={hasError ? fallbackSrc : src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        {...props}
      />
    </div>
  );
}
```

---

## 6. Implementation Sequence

### Step 1: Resource Hints (5 min)
1. Update `index.html` with additional preconnects
2. Verify in DevTools Network tab that connections are established early

### Step 2: Chart Lazy Loading (30 min)
1. Create `src/components/charts/LazyCharts.tsx`
2. Update chart exports to be default exports (required for `React.lazy`)
3. Update `SymbolPage.tsx` to use lazy chart components
4. Verify charts load with skeleton fallbacks

### Step 3: Landing Page Optimization (20 min)
1. Convert landing section imports to lazy
2. Add Suspense boundaries with skeleton fallbacks
3. Verify progressive loading in DevTools

### Step 4: Bundle Refinement (15 min)
1. Update `vite.config.ts` with extended manual chunks
2. Run `npm run build` and verify chunk distribution
3. Check chunk sizes in build output

### Step 5: Ask Panel Lazy Loading (15 min)
1. Create conditional lazy import for AskDeriveStreetPanel
2. Test panel opening/closing behavior
3. Verify no flash of loading state

---

## 7. Files to Create/Modify

### New Files
- `src/components/charts/LazyCharts.tsx` - Lazy wrapper for chart components
- `src/components/ui/OptimizedImage.tsx` - Image component with lazy loading

### Modified Files
- `index.html` - Add preconnects and font preload
- `vite.config.ts` - Extend manual chunks configuration
- `src/pages/Index.tsx` - Lazy load landing sections
- `src/pages/SymbolPage.tsx` - Use lazy chart components
- `src/components/charts/NarrativeChart.tsx` - Add default export
- `src/components/charts/EmotionChart.tsx` - Add default export
- `src/components/charts/SentimentChart.tsx` - Add default export
- `src/components/charts/EmotionMomentumChart.tsx` - Add default export

---

## 8. Expected Outcomes

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Landing page FCP | ~1.2s | ~0.8s | 33% faster |
| SymbolPage initial JS | ~450KB | ~280KB | 38% smaller |
| Chart component load | Synchronous | On-demand | Deferred until tab visible |
| Ask panel bundle | Always loaded | On-demand | Loaded only when opened |
| Supabase chunk caching | Mixed with app | Separate | Improved cache hits |

---

## 9. Verification Steps

### Lighthouse Audit
1. Run Lighthouse on `/` - expect FCP improvement
2. Run Lighthouse on `/symbol/AAPL` - expect TTI improvement

### Network Tab Analysis
1. Verify preconnects appear early in waterfall
2. Confirm chart chunks load only when tab is active
3. Check that Ask panel chunk loads on panel open

### Bundle Analysis
```bash
npm run build
# Check dist/assets for chunk distribution
# Verify vendor chunks are properly separated
```

---

## Technical Notes

- `React.lazy()` requires default exports - named exports need wrapper transformation
- Landing section lazy loading uses both `React.lazy` and `LazyLoad` for optimal deferral
- Chart skeletons match the Liquid Glass aesthetic for seamless transitions
- Font preloading requires self-hosted fonts; skip if using system fonts only
- Vite's `manualChunks` function syntax available for more complex splitting if needed
