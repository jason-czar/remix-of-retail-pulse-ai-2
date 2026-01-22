import { Skeleton } from "@/components/ui/skeleton";
import { StaggeredGroup, StaggeredItem } from "./StaggeredGroup";

export function TrendingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <StaggeredGroup className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <StaggeredItem>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-9 w-48" />
            </div>
            <Skeleton className="h-5 w-96" />
          </div>
        </StaggeredItem>
        <StaggeredItem>
          <Skeleton className="h-6 w-28 rounded-full" />
        </StaggeredItem>
      </StaggeredGroup>

      {/* Filters */}
      <StaggeredGroup className="flex flex-wrap items-center gap-4 mb-6" initialDelay={0.15}>
        <StaggeredItem>
          <Skeleton className="h-10 w-72" />
        </StaggeredItem>
        <StaggeredItem className="ml-auto">
          <Skeleton className="h-5 w-40" />
        </StaggeredItem>
      </StaggeredGroup>

      {/* Table Card */}
      <StaggeredGroup initialDelay={0.25}>
        <StaggeredItem>
          <div className="glass-card rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16 ml-auto" />
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-border">
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i} 
                  className="p-4 flex items-center gap-4"
                  style={{ 
                    opacity: 0,
                    animation: `fadeSlideIn 0.3s ease-out ${0.35 + i * 0.04}s forwards`
                  }}
                >
                  <Skeleton className="h-6 w-10" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-24 hidden md:block" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-8" />
                    <Skeleton className="h-2 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-8 w-24 ml-auto rounded-md" />
                </div>
              ))}
            </div>

            {/* Load More */}
            <div className="p-4 border-t border-border">
              <Skeleton className="h-10 w-full rounded-md" />
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
