import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  useDefaultWatchlist, 
  useAddToWatchlist, 
  useRemoveFromWatchlist 
} from "@/hooks/use-watchlist";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface AddToWatchlistButtonProps {
  symbol: string;
  variant?: "default" | "icon";
  className?: string;
}

export function AddToWatchlistButton({ 
  symbol, 
  variant = "default",
  className 
}: AddToWatchlistButtonProps) {
  const { user } = useAuth();
  const { data: watchlist, isLoading: watchlistLoading } = useDefaultWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  const isInWatchlist = watchlist?.symbols.includes(symbol.toUpperCase()) ?? false;
  const isLoading = addToWatchlist.isPending || removeFromWatchlist.isPending;

  const handleToggle = async () => {
    if (!watchlist) return;

    if (isInWatchlist) {
      await removeFromWatchlist.mutateAsync({
        watchlistId: watchlist.id,
        symbol,
        currentSymbols: watchlist.symbols,
      });
    } else {
      await addToWatchlist.mutateAsync({
        watchlistId: watchlist.id,
        symbol,
        currentSymbols: watchlist.symbols,
      });
    }
  };

  // Don't show if not authenticated
  if (!user) return null;

  // Loading state while fetching watchlist
  if (watchlistLoading) {
    return variant === "icon" ? (
      <Button variant="ghost" size="icon" disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    ) : (
      <Button variant="outline" disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading...
      </Button>
    );
  }

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          "transition-colors",
          isInWatchlist && "text-chart-5",
          className
        )}
        title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Star 
            className={cn(
              "h-4 w-4",
              isInWatchlist && "fill-current"
            )} 
          />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="glass-pill"
      size="icon"
      onClick={handleToggle}
      disabled={isLoading}
      className={cn("h-10 w-10 rounded-full", className)}
      title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Star 
          className={cn(
            "h-4 w-4",
            isInWatchlist && "fill-current text-chart-5"
          )} 
        />
      )}
    </Button>
  );
}
