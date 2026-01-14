import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98]",
        "hero-outline": "border-2 border-primary/50 text-primary hover:bg-primary/10 hover:border-primary",
        bullish: "bg-bullish text-bullish-foreground hover:bg-bullish/90",
        bearish: "bg-bearish text-bearish-foreground hover:bg-bearish/90",
        glass: [
          "backdrop-blur-xl border shadow-sm",
          "bg-muted/60 border-border/40 text-foreground",
          "hover:bg-muted/80 hover:border-border/60",
          "dark:bg-[linear-gradient(135deg,hsl(240_15%_20%/0.4)_0%,hsl(240_15%_10%/0.2)_100%)]",
          "dark:border-white/10 dark:text-foreground",
          "dark:shadow-[0_8px_32px_hsl(240_15%_0%/0.4),0_2px_8px_hsl(240_20%_10%/0.2),inset_0_1px_0_hsl(0_0%_100%/0.08)]",
          "dark:hover:bg-[linear-gradient(135deg,hsl(240_15%_22%/0.5)_0%,hsl(240_15%_12%/0.3)_100%)]",
          "dark:hover:border-white/15",
        ].join(" "),
        "glass-pill": [
          "rounded-full backdrop-blur-xl border shadow-sm",
          "bg-muted/60 border-border/40 text-foreground",
          "hover:bg-muted/80 hover:border-border/60",
          "dark:bg-[linear-gradient(135deg,hsl(240_15%_20%/0.4)_0%,hsl(240_15%_10%/0.2)_100%)]",
          "dark:border-white/10 dark:text-foreground",
          "dark:shadow-[0_8px_32px_hsl(240_15%_0%/0.4),0_2px_8px_hsl(240_20%_10%/0.2),inset_0_1px_0_hsl(0_0%_100%/0.08)]",
          "dark:hover:bg-[linear-gradient(135deg,hsl(240_15%_22%/0.5)_0%,hsl(240_15%_12%/0.3)_100%)]",
          "dark:hover:border-white/15",
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
