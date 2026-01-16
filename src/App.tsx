import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Minimal loading fallback
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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
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
              <Route path="/api-docs" element={<ApiDocsPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
