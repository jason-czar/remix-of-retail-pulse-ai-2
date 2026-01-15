import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero Card */}
          <div className="relative bg-card rounded-2xl border border-border shadow-card p-8 md:p-12 lg:p-16 text-center">
            {/* Subtle top accent */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display leading-tight mb-6">
              We read the retail investor market,
              <br />
              <span className="text-primary">so you can stay ahead of it.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Institutional-grade intelligence on retail investor sentiment, narratives, 
              and psychology — delivered in real-time for strategic decision-making.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="px-8 group">
                  Request Access
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/symbol/NVDA">
                <Button variant="outline" size="lg" className="px-8">
                  View Live Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
