import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { AudienceSection } from "@/components/landing/AudienceSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { IntelligencePatternsSection } from "@/components/landing/IntelligencePatternsSection";
import { CredibilitySection } from "@/components/landing/CredibilitySection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { CursorLight } from "@/components/landing/CursorLight";

const Index = () => {
  const [bgLoaded, setBgLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { setTheme } = useTheme();

  // Cinematic intro: dark → light transition on every visit
  useEffect(() => {
    // Force dark mode for intro
    setTheme("dark");

    // After 2s in dark mode, start transition to light mode
    const transitionTimer = setTimeout(() => {
      setIsTransitioning(true);
      // Add transition class to body for smooth CSS transitions
      document.body.classList.add("theme-transitioning");
      setTheme("light");
    }, 2000);

    // End transition state after crossfade completes
    const endTransitionTimer = setTimeout(() => {
      setIsTransitioning(false);
      document.body.classList.remove("theme-transitioning");
    }, 3500);

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
        className={`fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-all duration-[1500ms] ease-out ${bgLoaded ? 'scale-100 blur-0' : 'scale-105 blur-sm'} ${bgLoaded ? 'dark:opacity-0 opacity-100' : 'opacity-0'}`}
        style={{ backgroundImage: bgLoaded ? "var(--landing-bg-light)" : undefined }}
      />
      <div 
        className={`fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-all duration-[1500ms] ease-out ${bgLoaded ? 'scale-100 blur-0' : 'scale-105 blur-sm'} ${bgLoaded ? 'dark:opacity-100 opacity-0' : 'opacity-0'}`}
        style={{ backgroundImage: bgLoaded ? "var(--landing-bg-dark)" : undefined }}
      />
      <CursorLight />
      <Header />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <AudienceSection />
        <HowItWorksSection />
        <IntelligencePatternsSection />
        <CredibilitySection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
