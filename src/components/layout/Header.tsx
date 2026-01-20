import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, Search, LogOut, Settings, Key } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SearchCommand } from "@/components/SearchCommand";
import { ThemeToggle } from "@/components/ThemeToggle";
export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const {
    user,
    signOut,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };
  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };
  return <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/30 dark:bg-background/30 border-b border-black/[0.08] dark:border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between relative">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-xl group-hover:blur-2xl transition-all duration-300" />
              
            </div>
            <span className="font-display text-xl">
              <span className="text-gradient">Derive</span>
              <span className="text-foreground font-semibold">Street</span>
            </span>
          </Link>

          {/* Desktop Navigation - Glass pill style - Absolutely centered */}
          <nav className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] backdrop-blur-sm">
              <Link to="/dashboard" className="px-4 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all duration-200">
                Dashboard
              </Link>
              <Link to="/trending" className="px-4 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all duration-200">
                Trending
              </Link>
              <Link to="/alerts" className="px-4 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all duration-200">
                Alerts
              </Link>
              <Link to="/api-docs" className="px-4 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all duration-200">
                API
              </Link>
              <Link to="/learn-more" className="px-4 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all duration-200">
                Learn 
              </Link>
              <Link to="/pricing" className="px-4 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all duration-200">
                Pricing
              </Link>
            </div>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="ghost" size="icon" className="hidden md:flex rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08]" onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </Button>
            <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
            
            <ThemeToggle />
            
            {!loading && <>
                {user ? <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08]">
                        <Avatar className="h-10 w-10 border-2 border-primary/40 shadow-[0_0_12px_hsl(var(--primary)/0.3)]">
                          <AvatarFallback className="bg-primary/20 text-primary font-medium">
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
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/settings/api-keys" className="flex items-center">
                          <Key className="mr-2 h-4 w-4" />
                          API Keys
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-black/[0.06] dark:bg-white/[0.06]" />
                      <DropdownMenuItem onClick={handleSignOut} className="text-bearish">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu> : <>
                    <Link to="/login">
                      <Button variant="ghost" className="hidden md:flex rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08]">
                        Sign in
                      </Button>
                    </Link>
                    <Link to="/signup">
                      <Button className="hidden md:flex rounded-full bg-primary/90 hover:bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)] transition-all duration-300">
                        Get Started
                      </Button>
                    </Link>
                  </>}
              </>}
            
            <Button variant="ghost" size="icon" className="md:hidden rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && <div className="md:hidden py-4 border-t border-black/[0.06] dark:border-white/[0.06] animate-fade-in">
            <nav className="flex flex-col gap-1">
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all py-3 px-3 rounded-xl">
                Dashboard
              </Link>
              <Link to="/trending" className="text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all py-3 px-3 rounded-xl">
                Trending
              </Link>
              <Link to="/alerts" className="text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all py-3 px-3 rounded-xl">
                Alerts
              </Link>
              <Link to="/api-docs" className="text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all py-3 px-3 rounded-xl">
                API Documentation
              </Link>
              <Link to="/learn-more" className="text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all py-3 px-3 rounded-xl">
                Learn More
              </Link>
              <Link to="/pricing" className="text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all py-3 px-3 rounded-xl">
                Pricing
              </Link>
              {user ? <div className="pt-4 mt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                  <Link to="/settings" className="flex items-center gap-3 py-3 px-3 text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-xl transition-all">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <button onClick={handleSignOut} className="flex items-center gap-3 py-3 px-3 text-bearish w-full hover:bg-bearish/10 rounded-xl transition-all">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div> : <div className="flex gap-2 pt-4 mt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" className="w-full rounded-full border-black/10 dark:border-white/20 hover:bg-black/[0.05] dark:hover:bg-white/10">Sign in</Button>
                  </Link>
                  <Link to="/signup" className="flex-1">
                    <Button className="w-full rounded-full bg-primary/90 hover:bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)]">Get Started</Button>
                  </Link>
                </div>}
            </nav>
          </div>}
      </div>
    </header>;
}