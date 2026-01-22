import { motion } from "framer-motion";
import { ReactNode } from "react";

interface StaggeredGroupProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

// Container that staggers its direct children
export function StaggeredGroup({ 
  children, 
  className,
  staggerDelay = 0.08,
  initialDelay = 0
}: StaggeredGroupProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}

interface StaggeredItemProps {
  children: ReactNode;
  className?: string;
}

// Individual item that fades in within a StaggeredGroup
export function StaggeredItem({ children, className }: StaggeredItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { 
          opacity: 0, 
          y: 8,
          scale: 0.98
        },
        visible: { 
          opacity: 1, 
          y: 0,
          scale: 1,
          transition: {
            duration: 0.3,
            ease: [0.25, 0.1, 0.25, 1]
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
}
