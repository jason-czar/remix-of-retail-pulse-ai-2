import { Skeleton } from "@/components/ui/skeleton";
import { StaggeredGroup, StaggeredItem } from "./StaggeredGroup";

export function SymbolPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Symbol Header */}
      <StaggeredGroup className="flex flex-row items-start justify-between gap-4 mb-4 md:mb-6 md:mt-[23px] mt-[15px]">
        <StaggeredItem className="flex-1">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap mb-2">
            <Skeleton className="h-8 md:h-10 w-28 md:w-36" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-5 md:h-6 w-40 md:w-52" />
        </StaggeredItem>
        <StaggeredItem className="flex flex-col lg:flex-row gap-2 shrink-0">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </StaggeredItem>
      </StaggeredGroup>

      {/* Tabs Section */}
      <StaggeredGroup className="mb-6 md:mb-8" staggerDelay={0.1} initialDelay={0.1}>
        {/* Mobile Time Range */}
        <StaggeredItem className="flex justify-center mb-3 md:hidden">
          <Skeleton className="h-9 w-64 rounded-full" />
        </StaggeredItem>
        
        {/* Tabs Header */}
        <StaggeredItem className="flex-col justify-between gap-3 mb-2 md:mb-3 flex md:flex-row">
          <Skeleton className="h-10 w-80" />
          <div className="hidden md:block">
            <Skeleton className="h-10 w-72 rounded-full" />
          </div>
        </StaggeredItem>

        {/* Chart Skeleton */}
        <StaggeredItem>
          <div className="glass-card p-4 md:p-6">
            <Skeleton className="h-[280px] md:h-[350px] w-full" />
          </div>
        </StaggeredItem>
      </StaggeredGroup>

      {/* Divider */}
      <div className="my-6 md:my-8">
        <Skeleton className="h-px w-full" />
      </div>

      {/* Decision Lens Selector */}
      <StaggeredGroup className="mb-[31px] flex gap-2 overflow-x-auto" staggerDelay={0.05} initialDelay={0.25}>
        {[...Array(5)].map((_, i) => (
          <StaggeredItem key={i}>
            <Skeleton className="h-10 w-24 rounded-full shrink-0" />
          </StaggeredItem>
        ))}
      </StaggeredGroup>

      {/* AI Summary + Readiness Grid */}
      <StaggeredGroup className="grid grid-cols-1 lg:grid-cols-[4fr_6fr] gap-4 lg:gap-6" staggerDelay={0.1} initialDelay={0.35}>
        {/* Intelligence Summary Card */}
        <StaggeredItem>
          <div className="glass-card p-4 md:p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </StaggeredItem>

        {/* Psychology Overview Card */}
        <StaggeredItem>
          <div className="glass-card p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-5 w-5" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-3 rounded-lg bg-secondary/30">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          </div>
        </StaggeredItem>
      </StaggeredGroup>

      {/* Narrative Coherence Section */}
      <StaggeredGroup className="mb-8 md:mb-12 mt-8 md:mt-10" staggerDelay={0.1} initialDelay={0.5}>
        <StaggeredItem>
          <Skeleton className="h-6 w-44 mb-4" />
        </StaggeredItem>
        <StaggeredItem className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <div className="glass-card p-5">
            <Skeleton className="h-[180px] w-full" />
          </div>
          <div className="glass-card p-5">
            <Skeleton className="h-[180px] w-full" />
          </div>
        </StaggeredItem>
      </StaggeredGroup>

      {/* Historical Episode Matcher */}
      <StaggeredGroup className="mb-8 md:mb-12" initialDelay={0.6}>
        <StaggeredItem>
          <div className="glass-card p-5">
            <Skeleton className="h-6 w-52 mb-4" />
            <Skeleton className="h-[120px] w-full" />
          </div>
        </StaggeredItem>
      </StaggeredGroup>

      {/* Narrative Impact Section */}
      <StaggeredGroup className="mb-8 md:mb-12" initialDelay={0.7}>
        <StaggeredItem>
          <div className="glass-card p-5">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        </StaggeredItem>
      </StaggeredGroup>
    </div>
  );
}
