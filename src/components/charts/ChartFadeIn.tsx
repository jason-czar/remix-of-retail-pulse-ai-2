import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ChartFadeInProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component that provides a smooth fade-in animation
 * when chart content replaces the skeleton loader.
 * Uses a 0.4s fade + slight slide-up for a polished transition.
 */
export function ChartFadeIn({ children, className }: ChartFadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
