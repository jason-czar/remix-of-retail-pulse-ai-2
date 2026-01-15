import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Bell, Menu, Search, Zap, LogOut, Settings, Key } from "lucide-react";
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
  return <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-lg group-hover:blur-xl transition-all" />
              <Zap className="h-8 w-8 text-primary relative" />
            </div>
            <span className="font-display text-xl">
              <span className="text-gradient">Sentiment</span>
              <span className="text-foreground">IQ</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              
              Dashboard
            </Link>
            <Link to="/trending" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trending
            </Link>
            <Link to="/alerts" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </Link>
            <Link to="/api-docs" className="text-muted-foreground hover:text-foreground transition-colors">
              API
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </Button>
            <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
            
            <ThemeToggle />
            
            {!loading && <>
                {user ? <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10 border-2 border-primary/30">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(user.email || "U")}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{user.email}</p>
                        <p className="text-xs text-muted-foreground">Free Plan</p>
                      </div>
                      <DropdownMenuSeparator />
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-bearish">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu> : <>
                    <Link to="/login">
                      <Button variant="ghost" className="hidden md:flex">
                        Sign in
                      </Button>
                    </Link>
                    <Link to="/signup">
                      <Button variant="hero" className="hidden md:flex">
                        Get Started
                      </Button>
                    </Link>
                  </>}
              </>}
            
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <nav className="flex flex-col gap-4">
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 py-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Link>
              <Link to="/trending" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 py-2">
                <TrendingUp className="h-4 w-4" />
                Trending
              </Link>
              <Link to="/alerts" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 py-2">
                <Bell className="h-4 w-4" />
                Alerts
              </Link>
              <Link to="/api-docs" className="text-muted-foreground hover:text-foreground transition-colors py-2">
                API Documentation
              </Link>
              {user ? <div className="pt-4 border-t border-border/50">
                  <Link to="/settings" className="flex items-center gap-2 py-2 text-muted-foreground hover:text-foreground">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <button onClick={handleSignOut} className="flex items-center gap-2 py-2 text-bearish w-full">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div> : <div className="flex gap-2 pt-4 border-t border-border/50">
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" className="w-full">Sign in</Button>
                  </Link>
                  <Link to="/signup" className="flex-1">
                    <Button variant="hero" className="w-full">Get Started</Button>
                  </Link>
                </div>}
            </nav>
          </div>}
      </div>
    </header>;
}