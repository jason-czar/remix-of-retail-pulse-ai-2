import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationMessage } from "@/contexts/AskDeriveStreetContext";

const STORAGE_KEY = "derivestreet:conversations";

interface ConversationPreview {
  symbol: string;
  preview: string;
  lastTimestamp: Date;
  messageCount: number;
}

interface ChatHistorySidebarProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onDeleteConversation: (symbol: string) => void;
}

export function ChatHistorySidebar({
  currentSymbol,
  onSelectSymbol,
  onDeleteConversation,
}: ChatHistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for storage changes to refresh the list
  useEffect(() => {
    const handleStorageChange = () => {
      setRefreshKey(prev => prev + 1);
    };

    // Also refresh periodically to catch local changes
    const interval = setInterval(handleStorageChange, 1000);

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const conversations = useMemo(() => {
    if (typeof window === "undefined") return [];
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    try {
      const all = JSON.parse(stored) as Record<string, ConversationMessage[]>;
      const previews: ConversationPreview[] = [];
      
      for (const [symbol, messages] of Object.entries(all)) {
        if (!messages || messages.length === 0) continue;
        
        // Find first user message for preview
        const firstUserMessage = messages.find(m => m.role === "user");
        const preview = firstUserMessage?.content || "New conversation";
        
        // Get last message timestamp
        const lastMessage = messages[messages.length - 1];
        const lastTimestamp = new Date(lastMessage.timestamp);
        
        previews.push({
          symbol,
          preview: preview.length > 40 ? preview.slice(0, 40) + "..." : preview,
          lastTimestamp,
          messageCount: messages.length,
        });
      }
      
      // Sort by most recent first
      return previews.sort((a, b) => b.lastTimestamp.getTime() - a.lastTimestamp.getTime());
    } catch {
      return [];
    }
  }, [refreshKey]);

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase().replace(/^\$/, ""); // Remove $ prefix if present
    return conversations.filter(conv => 
      conv.symbol.toLowerCase().includes(query) ||
      conv.preview.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    onDeleteConversation(symbol);
    // Force refresh after deletion
    setRefreshKey(prev => prev + 1);
  };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 200, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className={cn(
        "flex flex-col h-full overflow-hidden",
        "border-r border-black/[0.04] dark:border-white/[0.06]",
        "bg-black/[0.02] dark:bg-white/[0.02]"
      )}
    >
      {/* Header with search */}
      <div className="p-3 border-b border-black/[0.04] dark:border-white/[0.06] space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          History
        </h4>
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className={cn(
              "w-full pl-7 pr-2 py-1.5 text-xs",
              "bg-black/[0.03] dark:bg-white/[0.06]",
              "border border-transparent",
              "rounded-lg",
              "placeholder:text-muted-foreground/50",
              "focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/20",
              "transition-colors duration-150"
            )}
          />
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "No matching conversations" : "No previous conversations"}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filteredConversations.map((conv, index) => (
              <motion.button
                key={conv.symbol}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => onSelectSymbol(conv.symbol)}
                className={cn(
                  "w-full text-left p-3 group",
                  "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
                  "transition-colors duration-150",
                  conv.symbol.toUpperCase() === currentSymbol.toUpperCase() &&
                    "bg-primary/10 hover:bg-primary/15"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          conv.symbol.toUpperCase() === currentSymbol.toUpperCase()
                            ? "text-primary"
                            : "text-foreground"
                        )}
                      >
                        {conv.symbol}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        · {conv.messageCount}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {conv.preview}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatTime(conv.lastTimestamp)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(e, conv.symbol)}
                    className={cn(
                      "h-5 w-5 opacity-0 group-hover:opacity-100",
                      "transition-opacity duration-150",
                      "text-muted-foreground hover:text-destructive"
                    )}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Conversation count footer */}
      {conversations.length > 0 && (
        <div className="p-2 border-t border-black/[0.04] dark:border-white/[0.06]">
          <p className="text-[10px] text-muted-foreground/60 text-center">
            {filteredConversations.length} of {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </motion.div>
  );
}
