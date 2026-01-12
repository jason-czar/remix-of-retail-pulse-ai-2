import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useTrending } from "@/hooks/use-stocktwits";
import { TrendingUp, TrendingDown, Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchCommandProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SearchCommand({ open: controlledOpen, onOpenChange }: SearchCommandProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { data: trending = [], isLoading } = useTrending();

  // Support both controlled and uncontrolled modes
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, setIsOpen]);

  const handleSelect = useCallback((symbol: string) => {
    setIsOpen(false);
    setSearch("");
    navigate(`/symbol/${symbol.toUpperCase()}`);
  }, [navigate, setIsOpen]);

  // Filter trending based on search
  const filteredTrending = trending.filter((item) =>
    item.symbol.toLowerCase().includes(search.toLowerCase()) ||
    (item.name && item.name.toLowerCase().includes(search.toLowerCase()))
  );

  // Allow direct navigation if user types a symbol not in trending
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && search.trim() && filteredTrending.length === 0) {
      handleSelect(search.trim());
    }
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <CommandInput 
        placeholder="Search symbols... (e.g., AAPL, TSLA)" 
        value={search}
        onValueChange={setSearch}
        onKeyDown={handleKeyDown}
      />
      <CommandList>
        <CommandEmpty>
          {search.trim() ? (
            <div className="flex flex-col items-center gap-2">
              <p>No results found</p>
              <button 
                onClick={() => handleSelect(search.trim())}
                className="text-primary hover:underline text-sm"
              >
                Go to ${search.toUpperCase()}
              </button>
            </div>
          ) : (
            "Start typing to search..."
          )}
        </CommandEmpty>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {filteredTrending.length > 0 && (
              <CommandGroup heading="Trending Symbols">
                {filteredTrending.slice(0, 8).map((item) => (
                  <CommandItem
                    key={item.symbol}
                    value={item.symbol}
                    onSelect={() => handleSelect(item.symbol)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {item.trend === "bullish" ? (
                        <TrendingUp className="h-4 w-4 text-bullish" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-bearish" />
                      )}
                      <div>
                        <span className="font-mono font-semibold">${item.symbol}</span>
                        {item.name && (
                          <span className="text-muted-foreground ml-2 text-sm">
                            {item.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.trend === "bullish" ? "bullish" : "bearish"} className="text-xs">
                        {item.sentiment}
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {search.trim() && !filteredTrending.some(
              (item) => item.symbol.toLowerCase() === search.toLowerCase()
            ) && (
              <CommandGroup heading="Search">
                <CommandItem
                  value={search}
                  onSelect={() => handleSelect(search)}
                  className="cursor-pointer"
                >
                  <Search className="h-4 w-4 mr-2" />
                  <span>Search for </span>
                  <span className="font-mono font-semibold ml-1">${search.toUpperCase()}</span>
                </CommandItem>
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
