import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SidebarLayout } from "./SidebarLayout";

// Minimal content-only loader that doesn't disturb sidebar
function ContentLoader() {
  return (
    <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
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
