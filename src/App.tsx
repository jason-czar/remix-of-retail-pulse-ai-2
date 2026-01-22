import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";

// Lazy load all non-landing pages to reduce initial bundle size
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SymbolPage = lazy(() => import("./pages/SymbolPage"));
const TrendingPage = lazy(() => import("./pages/TrendingPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const ApiDocsPage = lazy(() => import("./pages/ApiDocsPage"));
const LearnMorePage = lazy(() => import("./pages/LearnMorePage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Minimal loading fallback for pages outside the app layout
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes without sidebar layout */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
            <Route path="/signup" element={<Suspense fallback={<PageLoader />}><SignupPage /></Suspense>} />
            <Route path="/onboarding" element={<Suspense fallback={<PageLoader />}><OnboardingPage /></Suspense>} />
            <Route path="/learn-more" element={<Suspense fallback={<PageLoader />}><LearnMorePage /></Suspense>} />
            <Route path="/pricing" element={<Suspense fallback={<PageLoader />}><PricingPage /></Suspense>} />
            
            {/* Routes with persistent sidebar layout */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/trending" element={<ProtectedRoute><TrendingPage /></ProtectedRoute>} />
              <Route path="/symbol/AAPL" element={<SymbolPage />} />
              <Route path="/symbol/NVDA" element={<SymbolPage />} />
              <Route path="/symbol/:symbol" element={<ProtectedRoute><SymbolPage /></ProtectedRoute>} />
              <Route path="/symbol/AAPL/messages" element={<MessagesPage />} />
              <Route path="/symbol/NVDA/messages" element={<MessagesPage />} />
              <Route path="/symbol/:symbol/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/settings/api-keys" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
              <Route path="/api-docs" element={<ApiDocsPage />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
