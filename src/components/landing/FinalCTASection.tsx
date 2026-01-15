import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ScrollReveal } from "./ScrollReveal";
import { motion } from "framer-motion";

export function FinalCTASection() {
  return (
    <section className="py-20 lg:py-28 relative">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-glow opacity-60 pointer-events-none" />
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div className="glass-card p-8 md:p-12 text-center relative overflow-hidden">
              {/* Subtle top accent glow */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              
              {/* Inner glow */}
              <motion.div 
                className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/10 rounded-full blur-3xl"
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              
              <div className="relative">
                <h2 className="text-2xl md:text-3xl font-display mb-4">
                  Ready to understand what
                  <br />
                  <span className="text-gradient">retail investors are thinking?</span>
                </h2>
                
                <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                  Join leading institutions using SentimentIQ to gain an edge in 
                  understanding retail investor behavior and sentiment.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/signup">
                    <Button size="lg" className="px-8 rounded-full group">
                      Request Access
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button variant="outline" size="lg" className="px-8 rounded-full backdrop-blur-sm">
                      Explore Demo
                    </Button>
                  </Link>
                </div>

                <p className="text-sm text-muted-foreground mt-6">
                  Free tier available • No credit card required
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
