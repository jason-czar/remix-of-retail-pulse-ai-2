import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CHART_SIDE_PANEL, CHART_SIDE_PANEL_MOBILE } from "@/lib/chart-constants";

interface ChartSkeletonProps {
  /** Show side panel skeleton (desktop only) */
  showSidePanel?: boolean;
  /** Show controls bar above chart */
  showControls?: boolean;
  /** Height of the chart area */
  chartHeight?: string;
  /** Variant for different chart types */
  variant?: "bar" | "line" | "stacked";
  className?: string;
}

/**
 * Reusable skeleton loader for chart components
 * Matches the Liquid Glass design system with shimmer effect
 */
export function ChartSkeleton({
  showSidePanel = true,
  showControls = true,
  chartHeight = "h-[280px] md:h-[350px]",
  variant = "bar",
  className,
}: ChartSkeletonProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Controls bar skeleton */}
      {showControls && (
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-full hidden md:block" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      )}

      {/* Main layout: Side panel + Chart */}
      <div className="flex gap-4">
        {/* Desktop Side Panel Skeleton */}
        {showSidePanel && (
          <div
            className={cn(
              "hidden md:flex flex-col flex-shrink-0 p-5 rounded-2xl",
              "bg-card/60 dark:bg-card/40 border border-border/50 backdrop-blur-xl",
              `w-[${CHART_SIDE_PANEL.WIDTH}px]`
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-12" />
            </div>

            {/* Price/Score area */}
            <div className="mb-4 pb-3 border-b border-border/30">
              <Skeleton className="h-8 w-24" />
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>

            {/* List items */}
            <div className="space-y-3 pt-3 border-t border-border/30">
              <Skeleton className="h-4 w-20 mb-2" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-sm" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart Area Skeleton */}
        <div className={cn("flex-1", chartHeight)}>
          <div className="relative h-full w-full rounded-xl bg-card/30 dark:bg-card/20 border border-border/30 overflow-hidden">
            {/* Y-axis area */}
            <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between py-4 px-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-3 w-6" />
              ))}
            </div>

            {/* Chart content area */}
            <div className="absolute left-12 right-4 top-4 bottom-10">
              {variant === "bar" && <BarChartSkeleton />}
              {variant === "line" && <LineChartSkeleton />}
              {variant === "stacked" && <StackedBarSkeleton />}
            </div>

            {/* X-axis area */}
            <div className="absolute left-12 right-4 bottom-0 h-8 flex items-center justify-between px-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-3 w-10" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Side Panel (shown below chart) */}
      {showSidePanel && (
        <div
          className={cn(
            "md:hidden mt-4 p-4 rounded-2xl",
            "bg-card/60 dark:bg-card/40 border border-border/50 backdrop-blur-xl",
            CHART_SIDE_PANEL_MOBILE.WIDTH_CLASS
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-6 w-20 mb-3" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5 rounded-sm" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Bar chart skeleton with animated bars */
function BarChartSkeleton() {
  return (
    <div className="h-full w-full flex items-end justify-around gap-1 px-2">
      {[65, 45, 80, 55, 70, 40, 85, 60, 50, 75, 45, 65].map((height, i) => (
        <Skeleton
          key={i}
          className="flex-1 min-w-[8px] max-w-[24px] rounded-t-md"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

/** Line chart skeleton with gradient area */
function LineChartSkeleton() {
  return (
    <div className="h-full w-full relative">
      {/* Simulated line path using gradient */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineSkeletonGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0,70 Q50,50 100,55 T200,45 T300,60 T400,40 T500,50 L500,100 L0,100 Z"
          fill="url(#lineSkeletonGradient)"
          className="animate-pulse"
        />
        <path
          d="M0,70 Q50,50 100,55 T200,45 T300,60 T400,40 T500,50"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="2"
          className="animate-pulse"
        />
      </svg>
      {/* Data points */}
      <div className="absolute inset-0 flex items-center justify-around">
        {[...Array(6)].map((_, i) => (
          <Skeleton
            key={i}
            className="h-3 w-3 rounded-full"
            style={{ marginTop: `${[20, 10, 15, 5, 12, 8][i] * 2}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Stacked bar chart skeleton */
function StackedBarSkeleton() {
  const stacks = [
    [30, 20, 15],
    [25, 30, 10],
    [40, 15, 20],
    [20, 25, 25],
    [35, 20, 15],
    [30, 25, 10],
    [25, 30, 20],
    [45, 15, 10],
  ];

  return (
    <div className="h-full w-full flex items-end justify-around gap-2 px-2">
      {stacks.map((segments, i) => (
        <div key={i} className="flex-1 min-w-[12px] max-w-[32px] flex flex-col-reverse gap-[1px]">
          {segments.map((height, j) => (
            <Skeleton
              key={j}
              className={cn(
                "w-full",
                j === segments.length - 1 ? "rounded-t-md" : "",
                j === 0 ? "rounded-b-md" : ""
              )}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
