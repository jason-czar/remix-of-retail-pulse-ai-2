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

const INTRO_SESSION_KEY = "landing-intro-shown";

const Index = () => {
  const [bgLoaded, setBgLoaded] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  // One-time cinematic intro: dark → light transition
  useEffect(() => {
    const introShown = sessionStorage.getItem(INTRO_SESSION_KEY);
    
    if (introShown) {
      setIntroComplete(true);
      return;
    }

    // Force dark mode for intro
    setTheme("dark");

    // After 1.5s in dark mode, transition to light mode
    const transitionTimer = setTimeout(() => {
      setTheme("light");
    }, 1500);

    // Mark intro as complete after full sequence (1.5s dark + 1.5s transition)
    const completeTimer = setTimeout(() => {
      sessionStorage.setItem(INTRO_SESSION_KEY, "true");
      setIntroComplete(true);
    }, 3000);

    return () => {
      clearTimeout(transitionTimer);
      clearTimeout(completeTimer);
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
        className={`fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-out ${bgLoaded ? 'scale-100 blur-0' : 'scale-105 blur-sm'} ${bgLoaded ? 'dark:opacity-0 opacity-100' : 'opacity-0'}`}
        style={{ backgroundImage: bgLoaded ? "var(--landing-bg-light)" : undefined }}
      />
      <div 
        className={`fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-out ${bgLoaded ? 'scale-100 blur-0' : 'scale-105 blur-sm'} ${bgLoaded ? 'dark:opacity-100 opacity-0' : 'opacity-0'}`}
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
