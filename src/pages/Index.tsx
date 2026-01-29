import { useState, useEffect, lazy, Suspense } from "react";
import { useTheme } from "next-themes";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CursorLight } from "@/components/landing/CursorLight";

// Above-fold section (loaded synchronously for FCP)
import { HeroSection } from "@/components/landing/HeroSection";

// Below-fold sections (lazy loaded for better initial performance)
const ProblemSection = lazy(() => import("@/components/landing/ProblemSection").then(m => ({ default: m.ProblemSection })));
const SolutionSection = lazy(() => import("@/components/landing/SolutionSection").then(m => ({ default: m.SolutionSection })));
const AudienceSection = lazy(() => import("@/components/landing/AudienceSection").then(m => ({ default: m.AudienceSection })));
const HowItWorksSection = lazy(() => import("@/components/landing/HowItWorksSection").then(m => ({ default: m.HowItWorksSection })));
const IntelligencePatternsSection = lazy(() => import("@/components/landing/IntelligencePatternsSection").then(m => ({ default: m.IntelligencePatternsSection })));
const CredibilitySection = lazy(() => import("@/components/landing/CredibilitySection").then(m => ({ default: m.CredibilitySection })));
const FinalCTASection = lazy(() => import("@/components/landing/FinalCTASection").then(m => ({ default: m.FinalCTASection })));

// Lightweight skeleton for lazy sections
function SectionSkeleton() {
  return <div className="w-full h-[400px] animate-pulse bg-muted/10" />;
}

const Index = () => {
  const [bgLoaded, setBgLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { setTheme } = useTheme();

  // Cinematic intro: dark → light transition on every visit (desktop only)
  useEffect(() => {
    // Check if mobile/tablet (skip animation on smaller screens)
    const isMobileOrTablet = window.matchMedia("(max-width: 1024px)").matches;
    
    if (isMobileOrTablet) {
      // On mobile/tablet, just set light theme immediately without animation
      setTheme("light");
      return;
    }

    // Desktop: Force dark mode for intro
    setTheme("dark");

    // After 3s in dark mode, start transition to light mode
    const transitionTimer = setTimeout(() => {
      setIsTransitioning(true);
      // Add transition class to body for smooth CSS transitions
      document.body.classList.add("theme-transitioning");
      setTheme("light");
    }, 3000);

    // End transition state after crossfade completes (3s dark + 2.5s transition)
    const endTransitionTimer = setTimeout(() => {
      setIsTransitioning(false);
      document.body.classList.remove("theme-transitioning");
    }, 5500);

    return () => {
      clearTimeout(transitionTimer);
      clearTimeout(endTransitionTimer);
      document.body.classList.remove("theme-transitioning");
    };
  }, [setTheme]);

  useEffect(() => {
    // Lazy load background images
    const loadImages = async () => {
      const [lightModule, darkModule] = await Promise.all([
        import("@/assets/landing-bg-light.webp"),
        import("@/assets/landing-bg-dark.webp"),
      ]);

      // Preload both images
      const preloadImage = (src: string) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = src;
        });

      await Promise.all([
        preloadImage(lightModule.default),
        preloadImage(darkModule.default),
      ]);

      // Store URLs and mark as loaded
      document.documentElement.style.setProperty("--landing-bg-light", `url(${lightModule.default})`);
      document.documentElement.style.setProperty("--landing-bg-dark", `url(${darkModule.default})`);
      setBgLoaded(true);
    };

    loadImages();
  }, []);

  return (
    <div className="min-h-screen cursor-light-enabled relative">
      {/* Theme-aware background images with smooth crossfade animation */}
      <div 
        className={`fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-all duration-[2500ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${bgLoaded ? 'scale-100 blur-0' : 'scale-105 blur-sm'} ${bgLoaded ? 'dark:opacity-0 opacity-100' : 'opacity-0'}`}
        style={{ backgroundImage: bgLoaded ? "var(--landing-bg-light)" : undefined }}
      />
      <div 
        className={`fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-all duration-[2500ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${bgLoaded ? 'scale-100 blur-0' : 'scale-105 blur-sm'} ${bgLoaded ? 'dark:opacity-100 opacity-0' : 'opacity-0'}`}
        style={{ backgroundImage: bgLoaded ? "var(--landing-bg-dark)" : undefined }}
      />
      <CursorLight />
      <Header />
      <main>
        <HeroSection />
        <Suspense fallback={<SectionSkeleton />}>
          <ProblemSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <SolutionSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <AudienceSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <HowItWorksSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <IntelligencePatternsSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <CredibilitySection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <FinalCTASection />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
