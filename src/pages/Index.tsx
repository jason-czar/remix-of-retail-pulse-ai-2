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
