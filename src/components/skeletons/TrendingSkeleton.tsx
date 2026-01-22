import { Skeleton } from "@/components/ui/skeleton";

export function TrendingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-9 w-48" />
          </div>
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-40 ml-auto" />
      </div>

      {/* Table Card */}
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
            <div key={i} className="p-4 flex items-center gap-4">
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
    </div>
  );
}
