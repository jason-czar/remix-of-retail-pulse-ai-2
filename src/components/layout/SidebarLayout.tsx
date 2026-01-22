import { ReactNode } from "react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CompactFooter } from "./CompactFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Search, LogOut } from "lucide-react";
import { useState } from "react";
import { SearchCommand } from "@/components/SearchCommand";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { MessagesSidebarProvider, useMessagesSidebar } from "@/contexts/MessagesSidebarContext";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SidebarLayoutProps {
  children: ReactNode;
  rightSidebar?: ReactNode;
}

// Inner component that can access sidebar context
function DesktopLayoutContent({ children, rightSidebar }: { children: ReactNode; rightSidebar?: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { state, sidebarWidth: leftSidebarWidth } = useSidebar();
  const { isOpen: rightSidebarOpen, sidebarWidth: rightSidebarWidth } = useMessagesSidebar();
  
  const isLeftExpanded = state === "expanded";
  // Calculate padding to center content between sidebars
  // Left: sidebar width + small gap
  const leftPadding = isLeftExpanded ? leftSidebarWidth + 12 : 64; // 48px collapsed + 16px
  // Right: only when messages sidebar is open
  const rightPadding = rightSidebarOpen ? rightSidebarWidth + 24 : 16;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <div className="flex-1 flex flex-col w-full">
        {/* Top bar with search, theme, and user - full width with its own padding */}
        <header 
          className="sticky top-0 z-40 flex h-14 items-center gap-4 bg-transparent transition-[padding] duration-300 ease-out"
          style={{ paddingLeft: `${leftPadding}px`, paddingRight: `${rightPadding}px` }}
        >
          <div className="flex-1" />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08]" 
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
          <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
          
          <ThemeToggle />
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08]">
                  <Avatar className="h-9 w-9 border-2 border-primary/40 shadow-[0_0_12px_hsl(var(--primary)/0.3)]">
                    <AvatarFallback className="bg-primary/20 text-primary font-medium text-sm">
                      {getInitials(user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 backdrop-blur-xl bg-white/95 dark:bg-popover/95 border-black/[0.08] dark:border-white/[0.08]" align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Free Plan</p>
                </div>
                <DropdownMenuSeparator className="bg-black/[0.06] dark:bg-white/[0.06]" />
                <DropdownMenuItem onClick={handleSignOut} className="text-bearish">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="hero" size="sm" onClick={() => navigate("/login")} className="gap-2">
              Sign In
            </Button>
          )}
        </header>
        
        {/* Main content with padding for sidebars */}
        <main 
          className="flex-1 transition-[padding] duration-300 ease-out"
          style={{ paddingLeft: `${leftPadding}px`, paddingRight: `${rightPadding}px` }}
        >
          {children}
        </main>
        
        <CompactFooter />
      </div>
      
      {/* Right sidebar rendered inside the context */}
      {rightSidebar}
    </>
  );
}

export function SidebarLayout({ children, rightSidebar }: SidebarLayoutProps) {
  const isMobile = useIsMobile();

  // Mobile: Use the original Header navigation
  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col w-full">
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  // Desktop: Use sidebar navigation with overlay sidebar (doesn't push content)
  return (
    <MessagesSidebarProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex flex-col w-full relative">
          {/* Sidebar as fixed overlay */}
          <AppSidebar />
          
          {/* Main content with offset for both sidebars */}
          <DesktopLayoutContent rightSidebar={rightSidebar}>
            {children}
          </DesktopLayoutContent>
        </div>
      </SidebarProvider>
    </MessagesSidebarProvider>
  );
}