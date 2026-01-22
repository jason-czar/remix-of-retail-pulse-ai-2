import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarLayout } from "./SidebarLayout";
import { Skeleton } from "@/components/ui/skeleton";

// Skeleton loader that matches common page layouts
function ContentLoader() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      
      {/* Card grid skeleton */}
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
      
      {/* Large card skeleton */}
      <div className="glass-card p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    </div>
  );
}

export function AppLayout() {
  const location = useLocation();

  return (
    <SidebarLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-full"
        >
          <Suspense fallback={<ContentLoader />}>
            <Outlet />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </SidebarLayout>
  );
}
