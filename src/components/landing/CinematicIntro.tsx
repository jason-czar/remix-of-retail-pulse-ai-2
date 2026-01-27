import { useState, useEffect } from "react";
import { motion } from "framer-motion";

type IntroPhase = "atmospheric" | "dark-reveal" | "light-transition" | "complete";

export function CinematicIntro() {
  const [phase, setPhase] = useState<IntroPhase>("atmospheric");

  useEffect(() => {
    // Phase 1 → 2: Atmospheric layer fades after 1.4s
    const darkRevealTimer = setTimeout(() => {
      setPhase("dark-reveal");
    }, 1400);

    // Phase 2 → 3: Hold dark mode for 1.5s, then start light transition
    const lightTransitionTimer = setTimeout(() => {
      setPhase("light-transition");
    }, 2900); // 1400ms + 1500ms

    // Phase 3 → Complete: Remove from DOM after light transition finishes
    const completeTimer = setTimeout(() => {
      setPhase("complete");
    }, 4400); // 2900ms + 1500ms for smooth dissolve

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

      {/* Layer 2: Dark mode tint - allows content to show through with dark appearance */}
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
        style={{
          // Semi-transparent dark overlay that lets content show through
          backgroundColor: 'rgba(10, 10, 14, 0.92)',
          backdropFilter: 'brightness(0.15) saturate(0.8)',
          WebkitBackdropFilter: 'brightness(0.15) saturate(0.8)',
        }}
      >
        {/* Subtle ambient glow in center during dark-reveal phase */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: phase === "dark-reveal" ? 1 : 0
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,255,255,0.06) 0%, transparent 70%)'
          }}
        />
      </motion.div>
    </>
  );
}
