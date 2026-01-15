import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function FinalCTASection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-card rounded-2xl border border-border shadow-elevated p-8 md:p-12 text-center">
            {/* Subtle top accent */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent rounded-t-2xl" />
            
            <h2 className="text-2xl md:text-3xl font-display mb-4">
              Ready to understand what
              <br />
              <span className="text-primary">retail investors are thinking?</span>
            </h2>
            
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join leading institutions using SentimentIQ to gain an edge in 
              understanding retail investor behavior and sentiment.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="px-8 group">
                  Request Access
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" size="lg" className="px-8">
                  Explore Demo
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              Free tier available • No credit card required
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
