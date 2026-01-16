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

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
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
