import { useState, useEffect, useCallback } from "react";
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
  const [scrollY, setScrollY] = useState(0);

  // Parallax scroll handler with throttling for performance
  const handleScroll = useCallback(() => {
    requestAnimationFrame(() => {
      setScrollY(window.scrollY);
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

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

  // Parallax transform - background moves up at 30% of scroll speed
  const parallaxTransform = `translateY(${scrollY * -0.3}px) scale(1.1)`;

  return (
    <div className="min-h-screen cursor-light-enabled relative overflow-x-hidden">
      {/* Theme-aware background images with smooth crossfade and parallax */}
      <div 
        className={`fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-out ${bgLoaded ? 'dark:opacity-0 opacity-100' : 'opacity-0'}`}
        style={{ 
          backgroundImage: bgLoaded ? "var(--landing-bg-light)" : undefined,
          transform: parallaxTransform,
          willChange: "transform"
        }}
      />
      <div 
        className={`fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-out ${bgLoaded ? 'dark:opacity-100 opacity-0' : 'opacity-0'}`}
        style={{ 
          backgroundImage: bgLoaded ? "var(--landing-bg-dark)" : undefined,
          transform: parallaxTransform,
          willChange: "transform"
        }}
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
