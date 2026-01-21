import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Bell, 
  BarChart3, 
  FileCode, 
  Settings,
  ChevronDown,
  Star
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useDefaultWatchlist } from "@/hooks/use-watchlist";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Trending", url: "/trending", icon: TrendingUp },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "API", url: "/api-docs", icon: FileCode },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { data: watchlist } = useDefaultWatchlist();
  
  const isActive = (path: string) => location.pathname === path;
  const isSymbolActive = location.pathname.startsWith("/symbol/");

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-white/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-[hsl(0_0%_10%/0.85)] backdrop-blur-xl"
    >
      <SidebarHeader className="p-4 border-b border-black/[0.04] dark:border-white/[0.06]">
        <Link to="/" className="flex items-center gap-2 group">
          <span className={cn("font-display text-lg transition-opacity", collapsed && "sr-only")}>
            <span className="text-gradient">Derive</span>
            <span className="text-foreground font-semibold">Street</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Watchlist - Expandable */}
        <SidebarGroup>
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarMenuItem className="list-none">
              <CollapsibleTrigger asChild>
                <SidebarMenuButton 
                  tooltip="Watchlist"
                  isActive={isSymbolActive}
                  className="w-full"
                >
                  <Star className="h-4 w-4" />
                  <span className={cn(collapsed && "sr-only")}>Watchlist</span>
                  <ChevronDown className={cn(
                    "ml-auto h-4 w-4 transition-transform duration-200",
                    "group-data-[state=open]/collapsible:rotate-180",
                    collapsed && "sr-only"
                  )} />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {watchlist?.symbols && watchlist.symbols.length > 0 ? (
                    watchlist.symbols.map((symbol) => (
                      <SidebarMenuSubItem key={symbol}>
                        <SidebarMenuSubButton 
                          asChild 
                          isActive={location.pathname === `/symbol/${symbol}`}
                        >
                          <Link to={`/symbol/${symbol}`}>
                            <span className="font-mono text-sm">${symbol}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))
                  ) : (
                    <SidebarMenuSubItem>
                      <span className="text-xs text-muted-foreground px-2 py-1">
                        No symbols yet
                      </span>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarGroup>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={cn(collapsed && "sr-only")}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className={cn(collapsed && "sr-only")}>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-black/[0.04] dark:border-white/[0.06]">
        <div className={cn(
          "text-xs text-muted-foreground text-center py-2",
          collapsed && "sr-only"
        )}>
          <kbd className="px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.08] text-[10px] backdrop-blur-sm">⌘</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.08] text-[10px] ml-1 backdrop-blur-sm">B</kbd>
          <span className="ml-2">to toggle</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
