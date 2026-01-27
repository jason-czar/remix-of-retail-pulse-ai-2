import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
const Tabs = TabsPrimitive.Root;
const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({
  className,
  ...props
}, ref) => <TabsPrimitive.List ref={ref} className={cn(
  "relative overflow-visible inline-flex h-auto items-center justify-center gap-1.5 text-muted-foreground rounded-2xl py-2 px-3",
  // Liquid Glass styling - subtle and seamless
  "bg-white/80 dark:bg-[hsl(0_0%_15%/0.45)]",
  "backdrop-blur-[20px] backdrop-saturate-[140%]",
  "border border-black/[0.04] dark:border-white/[0.06]",
  // Minimal shadow - just enough depth without boxy appearance
  "shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
  "dark:shadow-none",
  className
)} {...props} />);
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({
  className,
  ...props
}, ref) => <TabsPrimitive.Trigger ref={ref} className={cn(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium rounded-full ring-offset-background transition-all duration-200 px-4 py-1.5",
  "text-muted-foreground hover:text-foreground/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]",
  // Active state - Light mode
  "data-[state=active]:bg-white data-[state=active]:text-foreground",
  "data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]",
  "data-[state=active]:border data-[state=active]:border-black/[0.06]",
  // Active state - Dark mode
  "dark:data-[state=active]:bg-white/[0.12] dark:data-[state=active]:text-foreground",
  "dark:data-[state=active]:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]",
  "dark:data-[state=active]:border-white/[0.12]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  className
)} {...props} />);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({
  className,
  ...props
}, ref) => <TabsPrimitive.Content ref={ref} className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} {...props} />);
TabsContent.displayName = TabsPrimitive.Content.displayName;
export { Tabs, TabsList, TabsTrigger, TabsContent };