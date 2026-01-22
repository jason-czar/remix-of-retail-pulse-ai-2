import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 dark:bg-transparent">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-9 w-32" />
            </div>
            <Skeleton className="h-5 w-80" />
          </div>
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-4 md:p-5">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>

      {/* Main Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Sentiment Chart */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-[300px] w-full" />
        </div>

        {/* Volume Chart */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-36" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>

      {/* Psychology History Chart */}
      <div className="glass-card p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-44" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>

      {/* Sector Breakdown */}
      <div className="glass-card p-6 mb-8">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Symbol Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
              </div>
            </div>
            <Skeleton className="h-[100px] w-full mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
