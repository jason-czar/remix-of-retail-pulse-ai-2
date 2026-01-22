import { Skeleton } from "@/components/ui/skeleton";
import { StaggeredGroup, StaggeredItem } from "./StaggeredGroup";

export function AnalyticsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 dark:bg-transparent">
      {/* Header */}
      <StaggeredGroup className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <StaggeredItem className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-9 w-32" />
            </div>
            <Skeleton className="h-5 w-80" />
          </div>
        </StaggeredItem>
        <StaggeredItem>
          <Skeleton className="h-10 w-40 rounded-lg" />
        </StaggeredItem>
      </StaggeredGroup>

      {/* Summary Cards */}
      <StaggeredGroup className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" staggerDelay={0.06} initialDelay={0.1}>
        {[...Array(4)].map((_, i) => (
          <StaggeredItem key={i}>
            <div className="glass-card p-4 md:p-5">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-28" />
            </div>
          </StaggeredItem>
        ))}
      </StaggeredGroup>

      {/* Main Charts Grid */}
      <StaggeredGroup className="grid lg:grid-cols-2 gap-6 mb-8" staggerDelay={0.1} initialDelay={0.3}>
        {/* Sentiment Chart */}
        <StaggeredItem>
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
        </StaggeredItem>

        {/* Volume Chart */}
        <StaggeredItem>
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
        </StaggeredItem>
      </StaggeredGroup>

      {/* Psychology History Chart */}
      <StaggeredGroup initialDelay={0.5}>
        <StaggeredItem>
          <div className="glass-card p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-44" />
              </div>
            </div>
            <Skeleton className="h-[300px] w-full" />
          </div>
        </StaggeredItem>
      </StaggeredGroup>

      {/* Sector Breakdown */}
      <StaggeredGroup initialDelay={0.6}>
        <StaggeredItem>
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
        </StaggeredItem>
      </StaggeredGroup>

      {/* Symbol Cards Grid */}
      <StaggeredGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" staggerDelay={0.08} initialDelay={0.7}>
        {[...Array(6)].map((_, i) => (
          <StaggeredItem key={i}>
            <div className="glass-card p-5">
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
          </StaggeredItem>
        ))}
      </StaggeredGroup>
    </div>
  );
}
