import { useState, useEffect } from "react";
import { motion } from "framer-motion";

type IntroPhase = "atmospheric" | "dark-reveal" | "light-transition" | "complete";

export function CinematicIntro() {
  const [phase, setPhase] = useState<IntroPhase>("atmospheric");

  useEffect(() => {
    // Phase 1 → 2: Atmospheric layer fades to reveal dark mode (400ms)
    const darkRevealTimer = setTimeout(() => {
      setPhase("dark-reveal");
    }, 400);

    // Phase 2 → 3: Hold dark mode, then start light transition (1.5s later)
    const lightTransitionTimer = setTimeout(() => {
      setPhase("light-transition");
    }, 1900); // 400ms + 1500ms

    // Phase 3 → Complete: Remove from DOM after light transition finishes
    const completeTimer = setTimeout(() => {
      setPhase("complete");
    }, 3400); // 1900ms + 1500ms for smooth transition

    return () => {
      clearTimeout(darkRevealTimer);
      clearTimeout(lightTransitionTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  if (phase === "complete") return null;

  return (
    <>
      {/* Layer 1: Dark atmospheric intro - fades out first */}
      <motion.div
        className="fixed inset-0 z-50 pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ 
          opacity: phase === "atmospheric" ? 1 : 0,
        }}
        transition={{ 
          duration: 0.8,
          ease: [0.25, 0.1, 0.25, 1]
        }}
      >
        {/* Deep dark background */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, #0a0a0c 0%, #12121a 50%, #0a0a0c 100%)'
          }}
        />
        
        {/* Subtle noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Vignette */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)'
          }}
        />
      </motion.div>

      {/* Layer 2: Dark mode overlay - simulates dark theme, then fades to light */}
      <motion.div
        className="fixed inset-0 z-40 pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ 
          opacity: phase === "light-transition" ? 0 : 1,
        }}
        transition={{ 
          duration: 1.5,
          ease: [0.4, 0.0, 0.2, 1] // Smooth material easing
        }}
      >
        {/* Dark theme simulation layer */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, hsl(240 10% 6%) 0%, hsl(240 8% 8%) 50%, hsl(240 10% 6%) 100%)'
          }}
        />
        
        {/* Subtle ambient glow to hint at content */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: phase === "dark-reveal" ? 0.15 : 0
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 35%, rgba(255,255,255,0.1) 0%, transparent 70%)'
          }}
        />
      </motion.div>
    </>
  );
}
