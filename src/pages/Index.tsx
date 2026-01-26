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

  // Parallax scroll handler with throttling via requestAnimationFrame
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

  return (
    <div className="min-h-screen cursor-light-enabled relative">
      {/* Theme-aware background images with smooth fade-in animation and parallax */}
      <div 
        className={`fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat dark:hidden transition-all duration-1000 ease-out ${bgLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-sm'}`}
        style={{ 
          backgroundImage: bgLoaded ? "var(--landing-bg-light)" : undefined,
          transform: `translateY(${scrollY * 0.15}px) scale(${bgLoaded ? 1.1 : 1.15})`,
        }}
      />
      <div 
        className={`fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat hidden dark:block transition-all duration-1000 ease-out ${bgLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-sm'}`}
        style={{ 
          backgroundImage: bgLoaded ? "var(--landing-bg-dark)" : undefined,
          transform: `translateY(${scrollY * 0.15}px) scale(${bgLoaded ? 1.1 : 1.15})`,
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
