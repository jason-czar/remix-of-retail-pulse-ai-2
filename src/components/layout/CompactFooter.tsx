import { Link } from "react-router-dom";
import { MetricsGlossary } from "@/components/MetricsGlossary";

export function CompactFooter() {
  return (
    <footer className="border-t border-border/30 py-4 px-4">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Derive Street</span>
        
        <nav className="flex items-center gap-4">
          <MetricsGlossary 
            trigger={
              <button className="hover:text-foreground transition-colors">
                Help
              </button>
            } 
          />
          <Link to="/api-docs" className="hover:text-foreground transition-colors">
            API
          </Link>
          <a href="#" className="hover:text-foreground transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Status
          </a>
        </nav>
      </div>
    </footer>
  );
}
