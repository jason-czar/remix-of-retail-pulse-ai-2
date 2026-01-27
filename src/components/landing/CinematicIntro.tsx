import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export function CinematicIntro() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Start exit transition after initial delay
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 400);

    // Remove from DOM after animation completes
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 1800);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 pointer-events-none"
      initial={{ opacity: 1 }}
      animate={{ 
        opacity: isExiting ? 0 : 1,
      }}
      transition={{ 
        duration: 1.4,
        ease: [0.25, 0.1, 0.25, 1] // Smooth cubic bezier
      }}
    >
      {/* Dark atmospheric layer */}
      <div 
        className="absolute inset-0 bg-[#0a0a0c]"
        style={{
          background: 'linear-gradient(180deg, #0a0a0c 0%, #12121a 50%, #0a0a0c 100%)'
        }}
      />
      
      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Soft vignette for depth */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)'
        }}
      />
      
      {/* Subtle center glow - hints at content beneath */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 0.6 : 0.2 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 40%, rgba(255,255,255,0.08) 0%, transparent 70%)'
        }}
      />
    </motion.div>
  );
}
