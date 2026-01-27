import { useState, useEffect, useRef } from "react";
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
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [showOverlay, setShowOverlay] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { setTheme } = useTheme();

  // Cinematic intro: dark → light crossfade on every visit
  useEffect(() => {
    // Force dark mode for intro
    setTheme("dark");
    setOverlayOpacity(1);
    setShowOverlay(true);

    // After 2s in dark mode, switch to light and fade out dark overlay
    const transitionTimer = setTimeout(() => {
      // Switch theme instantly (hidden behind overlay)
      setTheme("light");
      
      // Start fading out the dark overlay to reveal light theme
      requestAnimationFrame(() => {
        setOverlayOpacity(0);
      });
    }, 2000);

    // Remove overlay from DOM after fade completes
    const cleanupTimer = setTimeout(() => {
      setShowOverlay(false);
    }, 3600);

    return () => {
      clearTimeout(transitionTimer);
      clearTimeout(cleanupTimer);
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
      {/* Dark mode snapshot overlay for crossfade effect */}
      {showOverlay && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[9999] pointer-events-none transition-opacity duration-[1500ms] ease-out"
          style={{ opacity: overlayOpacity }}
        >
          {/* Dark background */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: bgLoaded ? "var(--landing-bg-dark)" : undefined, backgroundColor: '#1E1E1E' }}
          />
          {/* Dark theme content overlay - matches dark theme colors */}
          <div className="absolute inset-0 bg-[#1E1E1E]" />
        </div>
      )}
      
      {/* Theme-aware background images */}
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
