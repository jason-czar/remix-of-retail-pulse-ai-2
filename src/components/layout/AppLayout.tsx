import { Suspense, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarLayout } from "./SidebarLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { SkipToContent } from "@/components/ui/skip-to-content";
import {
  DashboardSkeleton,
  SymbolPageSkeleton,
  AnalyticsSkeleton,
  TrendingSkeleton,
  AlertsSkeleton
} from "@/components/skeletons";

// Generic fallback skeleton for routes without specific skeletons
function GenericSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="glass-card p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    </div>
  );
}

// Route-specific skeleton loader component
function RouteSkeletonLoader({ pathname }: { pathname: string }) {
  // Dashboard routes
  if (pathname === "/" || pathname === "/dashboard") {
    return <DashboardSkeleton />;
  }
  
  // Symbol page routes
  if (pathname.startsWith("/symbol/")) {
    return <SymbolPageSkeleton />;
  }
  
  // Analytics page
  if (pathname === "/analytics") {
    return <AnalyticsSkeleton />;
  }
  
  // Trending page
  if (pathname === "/trending") {
    return <TrendingSkeleton />;
  }
  
  // Alerts page
  if (pathname === "/alerts") {
    return <AlertsSkeleton />;
  }
  
  // Fallback to generic skeleton
  return <GenericSkeleton />;
}

export function AppLayout() {
  const location = useLocation();

  // Memoize the skeleton component to prevent unnecessary re-renders
  const skeletonFallback = useMemo(
    () => <RouteSkeletonLoader pathname={location.pathname} />,
    [location.pathname]
  );

  return (
    <SidebarLayout>
      <SkipToContent />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-full"
          id="main-content"
        >
          <Suspense fallback={skeletonFallback}>
            <Outlet />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </SidebarLayout>
  );
}
