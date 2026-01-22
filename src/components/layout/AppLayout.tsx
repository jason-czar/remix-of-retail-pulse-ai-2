import { Suspense } from "react";
import { Outlet } from "react-router-dom";
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
  return (
    <SidebarLayout>
      <Suspense fallback={<ContentLoader />}>
        <Outlet />
      </Suspense>
    </SidebarLayout>
  );
}
