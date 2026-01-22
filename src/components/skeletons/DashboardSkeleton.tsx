import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-9 w-40 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Watchlist Card */}
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

          {/* Market Overview Card */}
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Market Psychology Card */}
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

          {/* Psychology History Chart */}
          <div className="glass-card p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-[200px] w-full" />
          </div>

          {/* Alerts Card */}
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

          {/* Trending Card */}
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
        </div>
      </div>
    </div>
  );
}
