import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
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
  const conversations = useMemo(() => {
    if (typeof window === "undefined") return [];
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    try {
      const all = JSON.parse(stored) as Record<string, ConversationMessage[]>;
      const previews: ConversationPreview[] = [];
      
      for (const [symbol, messages] of Object.entries(all)) {
        if (messages.length === 0) continue;
        
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
  }, []);

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
      {/* Header */}
      <div className="p-3 border-b border-black/[0.04] dark:border-white/[0.06]">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          History
        </h4>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground">
              No previous conversations
            </p>
          </div>
        ) : (
          <div className="py-1">
            {conversations.map((conv, index) => (
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
                        ${conv.symbol}
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
    </motion.div>
  );
}
