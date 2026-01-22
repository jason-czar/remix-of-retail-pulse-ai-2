import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // Base glass-like material
        "rounded-md relative overflow-hidden",
        "bg-gradient-to-b from-muted/80 to-muted",
        "backdrop-blur-sm",
        
        // Top highlight for glass reflection
        "after:absolute after:inset-x-0 after:top-0 after:h-[1px]",
        "after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent",
        
        // Shimmer sweep animation
        "before:absolute before:inset-0",
        "before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent",
        "before:animate-shimmer before:bg-[length:200%_100%]",
        
        // Dark mode adjustments
        "dark:from-white/[0.06] dark:to-white/[0.03]",
        "dark:before:via-white/[0.08]",
        "dark:after:via-white/[0.12]",
        
        // Subtle border for glass edge
        "ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]",
        
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
