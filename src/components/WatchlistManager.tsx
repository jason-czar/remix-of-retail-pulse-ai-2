import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Plus, 
  Search, 
  Loader2,
  Star,
  GripVertical
} from "lucide-react";
import { 
  useDefaultWatchlist, 
  useAddToWatchlist, 
  useRemoveFromWatchlist 
} from "@/hooks/use-watchlist";
import { useTrending } from "@/hooks/use-stocktwits";
import { cn } from "@/lib/utils";

interface WatchlistManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WatchlistManager({ open, onOpenChange }: WatchlistManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: watchlist, isLoading: watchlistLoading } = useDefaultWatchlist();
  const { data: trending = [] } = useTrending();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  const watchlistSymbols = watchlist?.symbols || [];

  // Filter suggestions based on search query, excluding already added symbols
  const suggestions = trending
    .filter(item => 
      !watchlistSymbols.includes(item.symbol) &&
      (item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
       (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())))
    )
    .slice(0, 5);

  const handleAddSymbol = async (symbol: string) => {
    if (!watchlist) return;
    
    await addToWatchlist.mutateAsync({
      watchlistId: watchlist.id,
      symbol: symbol.toUpperCase(),
      currentSymbols: watchlistSymbols,
    });
    setSearchQuery("");
  };

  const handleRemoveSymbol = async (symbol: string) => {
    if (!watchlist) return;
    
    await removeFromWatchlist.mutateAsync({
      watchlistId: watchlist.id,
      symbol,
      currentSymbols: watchlistSymbols,
    });
  };

  const handleAddCustomSymbol = () => {
    if (searchQuery.trim() && !watchlistSymbols.includes(searchQuery.toUpperCase())) {
      handleAddSymbol(searchQuery.trim());
    }
  };

  const isAdding = addToWatchlist.isPending;
  const isRemoving = removeFromWatchlist.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-chart-5" />
            Manage Watchlist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search/Add Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Add symbol (e.g., AAPL)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddCustomSymbol();
                }
              }}
              className="pl-9 pr-20 bg-secondary/50"
            />
            <Button
              size="sm"
              onClick={handleAddCustomSymbol}
              disabled={!searchQuery.trim() || isAdding}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
            >
              {isAdding ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>

          {/* Suggestions */}
          {searchQuery && suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-1">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <Button
                    key={item.symbol}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSymbol(item.symbol)}
                    disabled={isAdding}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {item.symbol}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Current Watchlist */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Your Symbols ({watchlistSymbols.length})
            </p>
            
            {watchlistLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : watchlistSymbols.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No symbols in your watchlist yet</p>
                <p className="text-sm">Search and add symbols above</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {watchlistSymbols.map((symbol) => {
                  const trendingData = trending.find(t => t.symbol === symbol);
                  return (
                    <div
                      key={symbol}
                      className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 group"
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                        <div>
                          <span className="font-mono font-semibold">${symbol}</span>
                          {trendingData?.name && (
                            <span className="text-sm text-muted-foreground ml-2">
                              {trendingData.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {trendingData && (
                          <Badge 
                            variant={trendingData.trend === 'bullish' ? 'bullish' : 'bearish'}
                            className="text-xs"
                          >
                            {trendingData.sentiment}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSymbol(symbol)}
                          disabled={isRemoving}
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-bearish"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
