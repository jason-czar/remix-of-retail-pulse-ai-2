import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const glassCardClasses = cn(
  "rounded-2xl p-8 md:p-12",
  "bg-white/60 dark:bg-[hsl(0_0%_12%/0.55)]",
  "backdrop-blur-[28px] backdrop-saturate-[140%]",
  "border border-black/[0.08] dark:border-white/[0.06]",
  "shadow-[0_8px_32px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]"
);

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className={cn(glassCardClasses, "max-w-md w-full text-center")}>
          {/* Logo */}
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-8">
            <Zap className="h-8 w-8 text-primary" />
            <span className="font-display text-2xl">
              <span className="text-gradient">Derive</span>
              <span className="text-foreground">Street</span>
            </span>
          </Link>

          {/* 404 Display */}
          <div className="mb-6">
            <h1 className="text-7xl md:text-8xl font-bold text-primary/20 dark:text-primary/30 mb-2">
              404
            </h1>
            <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
              Page Not Found
            </h2>
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          {/* Action Button */}
          <Button asChild variant="hero" className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Return to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
