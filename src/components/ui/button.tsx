import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 dark:hover:shadow-[0_0_20px_hsl(168_84%_45%/0.3)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:hover:shadow-[0_0_20px_hsl(0_72%_51%/0.3)]",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground dark:hover:border-white/25 dark:hover:shadow-[0_0_12px_hsl(0_0%_100%/0.08)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:hover:shadow-[0_0_12px_hsl(0_0%_100%/0.06)]",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/8",
        link: "text-primary underline-offset-4 hover:underline dark:hover:text-primary/80",
        hero: "bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98]",
        "hero-outline": "border-2 border-primary/50 text-primary hover:bg-primary/10 hover:border-primary dark:hover:shadow-[0_0_20px_hsl(168_84%_45%/0.25)]",
        bullish: "bg-bullish text-bullish-foreground hover:bg-bullish/90 dark:hover:shadow-[0_0_20px_hsl(142_71%_45%/0.3)]",
        bearish: "bg-bearish text-bearish-foreground hover:bg-bearish/90 dark:hover:shadow-[0_0_20px_hsl(0_72%_51%/0.3)]",
        glass: [
          "backdrop-blur-xl border shadow-sm",
          "bg-muted/60 border-border/40 text-foreground",
          "hover:bg-muted/80 hover:border-border/60",
          "dark:bg-[linear-gradient(135deg,hsl(0_0%_24%/0.4)_0%,hsl(0_0%_16%/0.2)_100%)]",
          "dark:border-white/15 dark:text-foreground",
          "dark:shadow-[0_8px_32px_hsl(0_0%_0%/0.4),0_2px_8px_hsl(0_0%_5%/0.2),inset_0_1px_0_hsl(0_0%_100%/0.08)]",
          "dark:hover:bg-[linear-gradient(135deg,hsl(0_0%_28%/0.5)_0%,hsl(0_0%_20%/0.3)_100%)]",
          "dark:hover:border-white/25 dark:hover:shadow-[0_8px_32px_hsl(0_0%_0%/0.4),0_0_16px_hsl(168_84%_45%/0.15),inset_0_1px_0_hsl(0_0%_100%/0.1)]",
        ].join(" "),
        "glass-pill": [
          "rounded-full backdrop-blur-xl border shadow-sm",
          "bg-muted/60 border-border/40 text-foreground",
          "hover:bg-muted/80 hover:border-border/60",
          "dark:bg-[linear-gradient(135deg,hsl(0_0%_24%/0.4)_0%,hsl(0_0%_16%/0.2)_100%)]",
          "dark:border-white/15 dark:text-foreground",
          "dark:shadow-[0_8px_32px_hsl(0_0%_0%/0.4),0_2px_8px_hsl(0_0%_5%/0.2),inset_0_1px_0_hsl(0_0%_100%/0.08)]",
          "dark:hover:bg-[linear-gradient(135deg,hsl(0_0%_28%/0.5)_0%,hsl(0_0%_20%/0.3)_100%)]",
          "dark:hover:border-white/25 dark:hover:shadow-[0_8px_32px_hsl(0_0%_0%/0.4),0_0_16px_hsl(168_84%_45%/0.15),inset_0_1px_0_hsl(0_0%_100%/0.1)]",
        ].join(" "),
        glow: "btn-glow text-primary-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
