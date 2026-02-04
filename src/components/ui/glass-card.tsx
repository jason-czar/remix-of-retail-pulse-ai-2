import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glassCardVariants = cva(
  [
    // Base styles - always applied
    "rounded-2xl",
    "backdrop-blur-[28px] backdrop-saturate-[140%]",
    "transition-all duration-200",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-white/60 dark:bg-[hsl(0_0%_12%/0.55)]",
          "border border-black/[0.08] dark:border-white/[0.06]",
          "shadow-[0_8px_32px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]",
          "dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
        ],
        elevated: [
          "bg-white/70 dark:bg-[hsl(0_0%_14%/0.65)]",
          "border border-black/[0.1] dark:border-white/[0.08]",
          "shadow-[0_12px_48px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)]",
          "dark:shadow-[0_12px_48px_rgba(0,0,0,0.3)]",
        ],
        subtle: [
          "bg-white/45 dark:bg-white/[0.04]",
          "border border-black/[0.04] dark:border-white/[0.04]",
          "shadow-[0_2px_8px_rgba(0,0,0,0.02)]",
          "dark:shadow-none",
        ],
      },
      size: {
        sm: "p-3",
        md: "p-4 md:p-5",
        lg: "p-6 md:p-8",
      },
      hoverable: {
        true: "hover:bg-white/70 dark:hover:bg-[hsl(0_0%_12%/0.65)] cursor-pointer",
        false: "",
      },
      glow: {
        true: "ring-1 ring-primary/20 dark:ring-primary/30",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      hoverable: false,
      glow: false,
    },
  }
);

export interface GlassCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassCardVariants> {
  asChild?: boolean;
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant, size, hoverable, glow, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(glassCardVariants({ variant, size, hoverable, glow }), className)}
        {...props}
      />
    );
  }
);
GlassCard.displayName = "GlassCard";

export { GlassCard, glassCardVariants };
