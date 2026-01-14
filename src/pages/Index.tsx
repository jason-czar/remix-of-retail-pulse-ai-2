import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { LivePreviewSection } from "@/components/landing/LivePreviewSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { CTASection } from "@/components/landing/CTASection";
import { MeshBackground } from "@/components/MeshBackground";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <MeshBackground />
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <LivePreviewSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
