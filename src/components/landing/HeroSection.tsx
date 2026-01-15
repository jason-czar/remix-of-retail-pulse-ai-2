import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
export function HeroSection() {
  return <section className="relative pb-12 sm:pt-20 sm:pb-16 lg:pb-20 pt-[110px] lg:pt-[200px]">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero Card with glass effect */}
          <motion.div className="relative glass-card p-8 md:p-12 lg:p-16 text-center" initial={{
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
            
            <motion.h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-medium leading-tight mb-6" initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.2,
            ease: [0.25, 0.4, 0.25, 1]
          }}>
              <span className="block font-normal font-sans text-3xl">We read the retail investor market, so you can stay ahead of&nbsp;it.</span>
              
            </motion.h1>

            <motion.p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8" initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.35,
            ease: [0.25, 0.4, 0.25, 1]
          }}>
              Institutional-grade intelligence on retail investor sentiment, narratives, 
              and psychology — delivered in real-time for strategic decision-making.
            </motion.p>

            <motion.div className="flex flex-row flex-nowrap items-center justify-center gap-3 sm:gap-4 max-w-full overflow-x-auto scrollbar-hide" initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.5,
            ease: [0.25, 0.4, 0.25, 1]
          }}>
              <Link to="/symbol/NVDA" className="shrink-0">
                <Button size="lg" className="px-5 sm:px-8 rounded-full group">
                  View NVDA
                </Button>
              </Link>
              <Link to="/signup" className="shrink-0">
                <Button variant="outline" size="lg" className="px-5 sm:px-8 rounded-full backdrop-blur-sm">
                  Get Started
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>;
}