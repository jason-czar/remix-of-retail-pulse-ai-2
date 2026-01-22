import { Skeleton } from "@/components/ui/skeleton";
import { StaggeredGroup, StaggeredItem } from "./StaggeredGroup";

export function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <StaggeredGroup className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <StaggeredItem>
          <div>
            <Skeleton className="h-9 w-40 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
        </StaggeredItem>
        <StaggeredItem className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-28" />
        </StaggeredItem>
      </StaggeredGroup>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <StaggeredGroup className="lg:col-span-2 space-y-6" staggerDelay={0.1}>
          {/* Watchlist Card */}
          <StaggeredItem>
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-20" />
              </div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-4">
                      <div>
                        <Skeleton className="h-5 w-16 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Skeleton className="h-5 w-12 mb-1" />
                        <Skeleton className="h-4 w-10" />
                      </div>
                      <Skeleton className="h-2 w-16 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </StaggeredItem>

          {/* Market Overview Card */}
          <StaggeredItem>
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-4 rounded-lg bg-secondary/30">
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-8 w-20 mb-1" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))}
              </div>
            </div>
          </StaggeredItem>
        </StaggeredGroup>

        {/* Sidebar */}
        <StaggeredGroup className="space-y-6" staggerDelay={0.12} initialDelay={0.15}>
          {/* Market Psychology Card */}
          <StaggeredItem>
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
              <Skeleton className="h-24 w-full mb-4" />
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </StaggeredItem>

          {/* Psychology History Chart */}
          <StaggeredItem>
            <div className="glass-card p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <Skeleton className="h-[200px] w-full" />
            </div>
          </StaggeredItem>

          {/* Alerts Card */}
          <StaggeredItem>
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-8 w-16" />
              </div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </StaggeredItem>

          {/* Trending Card */}
          <StaggeredItem>
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-16" />
              </div>
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-14" />
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </StaggeredItem>
        </StaggeredGroup>
      </div>
    </div>
  );
}
