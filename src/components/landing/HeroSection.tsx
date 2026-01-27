import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
export function HeroSection() {
  const [animationPhase, setAnimationPhase] = useState<"waiting" | "centered" | "expanded">("waiting");
  useEffect(() => {
    // Start with centered headline after a brief moment
    const centeredTimer = setTimeout(() => {
      setAnimationPhase("centered");
    }, 500);

    // Expand to full layout after theme transition completes (4s = 2s dark + 2s transition)
    const expandedTimer = setTimeout(() => {
      setAnimationPhase("expanded");
    }, 4000);
    return () => {
      clearTimeout(centeredTimer);
      clearTimeout(expandedTimer);
    };
  }, []);
  return <section className="relative pb-12 sm:pb-16 lg:pb-20 pt-[110px] lg:pt-[200px] sm:pt-[150px]">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto px-0">
          {/* Hero Card with glass effect */}
          <motion.div className="relative glass-card p-8 md:p-12 lg:py-16 lg:px-12 text-center overflow-hidden flex items-center justify-center" initial={{
          opacity: 0,
          y: 30,
          scale: 0.98
        }} animate={{
          opacity: 1,
          y: 0,
          scale: 1
        }} transition={{
          duration: 0.7,
          ease: [0.25, 0.4, 0.25, 1]
        }}>
            {/* Subtle top accent glow */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent rounded-t-2xl" />

            {/* Content wrapper with dynamic height - centers headline during initial phase */}
            <motion.div className="flex flex-col items-center" style={{
            justifyContent: animationPhase === "expanded" ? "flex-start" : "center"
          }} animate={{
            minHeight: "100%"
          }} transition={{
            duration: 0.8,
            ease: [0.25, 0.4, 0.25, 1]
          }}>
              {/* Main headline - starts centered, animates up */}
              <motion.h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-medium leading-tight" initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: animationPhase !== "waiting" ? 1 : 0,
              y: animationPhase !== "waiting" ? 0 : 20,
              marginBottom: animationPhase === "expanded" ? "1.5rem" : "0"
            }} transition={{
              opacity: {
                duration: 0.6,
                delay: 0.2
              },
              y: {
                duration: 0.6,
                delay: 0.2
              },
              marginBottom: {
                duration: 0.8,
                ease: [0.25, 0.4, 0.25, 1]
              }
            }}>
                <span className="block font-normal font-sans text-3xl text-balance">
                  Actionable insights derived from the retail investor market.
                </span>
              </motion.h1>

              {/* Subheading - fades in after expansion */}
              <motion.p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8" initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: animationPhase === "expanded" ? 1 : 0,
              y: animationPhase === "expanded" ? 0 : 20
            }} transition={{
              duration: 0.6,
              delay: 0.3,
              ease: [0.25, 0.4, 0.25, 1]
            }}>
                Institutional-grade intelligence on retail investor sentiment, narratives, and behavior - delivered in
                real-time for strategic decision-making.
              </motion.p>

              {/* Buttons - fade in after subheading */}
              <motion.div className="flex flex-row flex-nowrap items-center justify-center gap-3 max-w-full overflow-visible py-0 sm:gap-[17px]" initial={{
              opacity: 0,
              y: 20
            }} animate={{
              opacity: animationPhase === "expanded" ? 1 : 0,
              y: animationPhase === "expanded" ? 0 : 20
            }} transition={{
              duration: 0.6,
              delay: 0.5,
              ease: [0.25, 0.4, 0.25, 1]
            }}>
                <Link to="/symbol/NVDA" className="shrink-0">
                  <Button size="lg" className="px-5 sm:px-8 rounded-full glass-button-primary shadow-[0_4px_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_8px_28px_hsl(var(--primary)/0.5)] hover:-translate-y-0.5 transition-all duration-300">
                    View NVDA
                  </Button>
                </Link>
                <Link to="/learn-more" className="shrink-0">
                  <Button variant="ghost" size="lg" className="px-5 sm:px-8 rounded-full glass-button-secondary shadow-[0_4px_16px_hsl(0_0%_0%/0.08)] dark:shadow-[0_4px_20px_hsl(0_0%_0%/0.5)] hover:shadow-[0_8px_24px_hsl(0_0%_0%/0.12)] dark:hover:shadow-[0_8px_28px_hsl(0_0%_0%/0.6)] hover:-translate-y-0.5 transition-all duration-300">
                    Learn More
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>;
}