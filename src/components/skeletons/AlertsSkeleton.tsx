import { Skeleton } from "@/components/ui/skeleton";
import { StaggeredGroup, StaggeredItem } from "./StaggeredGroup";

export function AlertsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <StaggeredGroup className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <StaggeredItem>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-9 w-28" />
            </div>
            <Skeleton className="h-5 w-80" />
          </div>
        </StaggeredItem>
        <StaggeredItem className="flex items-center gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </StaggeredItem>
      </StaggeredGroup>

      {/* Stats Row */}
      <StaggeredGroup className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" staggerDelay={0.06} initialDelay={0.12}>
        {[...Array(4)].map((_, i) => (
          <StaggeredItem key={i}>
            <div className="glass-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-7 w-10 mb-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
          </StaggeredItem>
        ))}
      </StaggeredGroup>

      {/* Filters */}
      <StaggeredGroup className="flex flex-wrap items-center gap-4 mb-6" initialDelay={0.35}>
        <StaggeredItem>
          <Skeleton className="h-10 w-80" />
        </StaggeredItem>
        <StaggeredItem className="ml-auto">
          <Skeleton className="h-5 w-28" />
        </StaggeredItem>
      </StaggeredGroup>

      {/* Table Card */}
      <StaggeredGroup initialDelay={0.45}>
        <StaggeredItem>
          <div className="glass-card rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16 ml-auto" />
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-border">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className="p-4 flex items-center gap-4"
                  style={{ 
                    opacity: 0,
                    animation: `fadeSlideIn 0.3s ease-out ${0.55 + i * 0.06}s forwards`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-6 w-28 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-3 w-3 rounded" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-5 w-24" />
                  <div className="flex items-center gap-3 ml-auto">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-5 w-10 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </StaggeredItem>
      </StaggeredGroup>

      {/* Quick Tips Card */}
      <StaggeredGroup className="mt-8" initialDelay={0.85}>
        <StaggeredItem>
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-28" />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-3" />
                  <div className="space-y-3">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <Skeleton className="h-4 w-4 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-28 mb-1" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </StaggeredItem>
      </StaggeredGroup>
      
      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
