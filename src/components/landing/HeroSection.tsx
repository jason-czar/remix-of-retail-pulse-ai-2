import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
export function HeroSection() {
  return <section className="relative py-20 lg:py-32">
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
              <span className="block font-normal font-sans text-4xl">We read the retail investor market, so you can stay ahead of it.  </span>
              <span className="text-gradient">so you can stay ahead of it.</span>
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

            <motion.div className="flex flex-col sm:flex-row gap-4 justify-center" initial={{
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
              <Link to="/signup">
                <Button size="lg" className="px-8 group">
                  Request Access
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/symbol/NVDA">
                <Button variant="outline" size="lg" className="px-8 backdrop-blur-sm">
                  View Live Demo
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>;
}