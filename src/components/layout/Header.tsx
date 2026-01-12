import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  BarChart3, 
  Bell, 
  Menu,
  Search,
  Zap
} from "lucide-react";
import { useState } from "react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
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
            <Link 
              to="/dashboard" 
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </Link>
            <Link 
              to="/trending" 
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Trending
            </Link>
            <Link 
              to="/alerts" 
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Alerts
            </Link>
            <Link 
              to="/api-docs" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              API
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Search className="h-5 w-5" />
            </Button>
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
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <nav className="flex flex-col gap-4">
              <Link 
                to="/dashboard" 
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 py-2"
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Link>
              <Link 
                to="/trending" 
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 py-2"
              >
                <TrendingUp className="h-4 w-4" />
                Trending
              </Link>
              <Link 
                to="/alerts" 
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 py-2"
              >
                <Bell className="h-4 w-4" />
                Alerts
              </Link>
              <Link 
                to="/api-docs" 
                className="text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                API Documentation
              </Link>
              <div className="flex gap-2 pt-4 border-t border-border/50">
                <Link to="/login" className="flex-1">
                  <Button variant="outline" className="w-full">Sign in</Button>
                </Link>
                <Link to="/signup" className="flex-1">
                  <Button variant="hero" className="w-full">Get Started</Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
