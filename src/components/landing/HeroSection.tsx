import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, TrendingUp, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-glow" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-chart-3/5 rounded-full blur-3xl animate-pulse-slow delay-1000" />
      
      <div className="container mx-auto px-4 py-24 lg:py-32 relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <Badge variant="glow" className="mb-6 animate-fade-in">
            <Sparkles className="h-3 w-3 mr-1" />
            Powered by StockTwits Intelligence
          </Badge>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display mb-6 animate-fade-in-up">
            Decode{" "}
            <span className="text-gradient">Retail Sentiment</span>
            <br />
            Before the Market Moves
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in-up delay-100">
            Institutional-grade sentiment analytics from millions of retail investor conversations. 
            Track narratives, emotions, and momentum in real-time.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in-up delay-200">
            <Link to="/symbol/NVDA">
              <Button variant="hero" size="xl" className="group">
                View NVDA
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/api-docs">
              <Button variant="hero-outline" size="xl">
                View API Docs
              </Button>
            </Link>
          </div>

          {/* Stats Preview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto animate-fade-in-up delay-300">
            <StatCard value="10M+" label="Messages/Day" />
            <StatCard value="8,500+" label="Symbols Tracked" />
            <StatCard value="<50ms" label="API Latency" />
            <StatCard value="99.9%" label="Uptime" />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass rounded-lg p-4 text-center hover:shadow-glow transition-shadow">
      <div className="text-2xl md:text-3xl font-display text-gradient mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
