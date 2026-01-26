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
import landingBgDark from "@/assets/landing-bg-dark.jpeg";
import landingBgLight from "@/assets/landing-bg-light.jpeg";

const Index = () => {
  return (
    <div className="min-h-screen cursor-light-enabled relative">
      {/* Theme-aware background images */}
      <div 
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat dark:hidden"
        style={{ backgroundImage: `url(${landingBgLight})` }}
      />
      <div 
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat hidden dark:block"
        style={{ backgroundImage: `url(${landingBgDark})` }}
      />
      {/* Subtle overlay gradient for text legibility */}
      <div 
        className="fixed inset-0 -z-[9] pointer-events-none dark:hidden"
        style={{ 
          background: 'radial-gradient(ellipse 120% 80% at 50% 0%, hsl(0 0% 100% / 0.7) 0%, hsl(0 0% 100% / 0.4) 40%, transparent 70%), linear-gradient(to bottom, hsl(0 0% 100% / 0.3) 0%, hsl(0 0% 100% / 0.5) 50%, hsl(0 0% 100% / 0.6) 100%)'
        }}
      />
      <div 
        className="fixed inset-0 -z-[9] pointer-events-none hidden dark:block"
        style={{ 
          background: 'radial-gradient(ellipse 120% 80% at 50% 0%, hsl(220 10% 8% / 0.75) 0%, hsl(220 10% 8% / 0.5) 40%, transparent 70%), linear-gradient(to bottom, hsl(220 10% 8% / 0.4) 0%, hsl(220 10% 8% / 0.5) 50%, hsl(220 10% 8% / 0.6) 100%)'
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
