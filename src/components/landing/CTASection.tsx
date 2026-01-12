import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-glow" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-xl" />
              <Zap className="h-16 w-16 text-primary relative" />
            </div>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-display mb-6">
            Ready to Decode{" "}
            <span className="text-gradient">Market Psychology?</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of traders and analysts using SentimentIQ to gain an edge 
            in understanding retail investor behavior.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button variant="hero" size="xl" className="group">
                Get Started Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="hero-outline" size="xl">
                Explore Demo
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            No credit card required • Free tier available forever
          </p>
        </div>
      </div>
    </section>
  );
}
