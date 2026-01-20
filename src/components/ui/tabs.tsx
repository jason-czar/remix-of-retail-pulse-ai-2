import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
const Tabs = TabsPrimitive.Root;
const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({
  className,
  ...props
}, ref) => <TabsPrimitive.List ref={ref} className={cn("relative overflow-visible inline-flex h-11 items-center justify-center p-1.5 text-muted-foreground bg-white/72 dark:bg-[hsl(0_0%_12%/0.45)] backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.08] py-0 rounded-full my-0 px-[7px] shadow-none", className)} {...props} />);
TabsList.displayName = TabsPrimitive.List.displayName;
const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({
  className,
  ...props
}, ref) => <TabsPrimitive.Trigger ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap text-sm rounded-full ring-offset-background transition-all duration-200 text-muted-foreground hover:text-foreground/80 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:dark:glass-tabs-trigger-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-0 font-normal mx-0 px-[10px] my-[112px] py-[7px]", className)} {...props} />);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(({
  className,
  ...props
}, ref) => <TabsPrimitive.Content ref={ref} className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} {...props} />);
TabsContent.displayName = TabsPrimitive.Content.displayName;
export { Tabs, TabsList, TabsTrigger, TabsContent };