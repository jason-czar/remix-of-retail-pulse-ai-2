import { useState, useMemo, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Clock, ExternalLink, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_DEFAULT_WIDTH = 320;

interface Message {
  id: string;
  user: string;
  content: string;
  sentiment: string;
  emotions: string[];
  time: string;
}

interface MessagesSidebarProps {
  symbol: string;
  messages: Message[];
  isLoading: boolean;
}

function CondensedMessageCard({ user, content, sentiment, time, searchTerm }: Omit<Message, 'id' | 'emotions'> & { searchTerm?: string }) {
  // Highlight matching text if there's a search term
  const highlightText = (text: string) => {
    if (!searchTerm || searchTerm.trim().length < 2) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-primary/30 text-foreground rounded-sm px-0.5">{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="p-3 glass-list-item">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-medium text-xs">@{user}</span>
        <Badge 
          variant={sentiment === "bullish" ? "bullish" : sentiment === "bearish" ? "bearish" : "neutral"} 
          className="text-[10px] px-1.5 py-0"
        >
          {sentiment}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {highlightText(content)}
      </p>
      <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-1.5">
        <Clock className="h-2.5 w-2.5" />
        {time}
      </span>
    </div>
  );
}

export function MessagesSidebar({ symbol, messages, isLoading }: MessagesSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  
  // Resizable width state - stored in localStorage
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('messages-sidebar:width');
      return saved ? parseInt(saved, 10) : SIDEBAR_DEFAULT_WIDTH;
    }
    return SIDEBAR_DEFAULT_WIDTH;
  });
  
  const handleSetSidebarWidth = useCallback((width: number) => {
    const clampedWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width));
    setSidebarWidth(clampedWidth);
    localStorage.setItem('messages-sidebar:width', String(clampedWidth));
  }, []);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // For right sidebar, width = viewport width - mouse X position - right inset (12px)
      const newWidth = window.innerWidth - e.clientX - 12;
      handleSetSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleSetSidebarWidth]);

  // Filter messages based on search term
  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      return messages.slice(0, 50);
    }
    
    const term = searchTerm.toLowerCase().trim();
    return messages
      .filter(msg => 
        msg.content.toLowerCase().includes(term) ||
        msg.user.toLowerCase().includes(term)
      )
      .slice(0, 50);
  }, [messages, searchTerm]);

  const displayCount = filteredMessages.length;
  const totalCount = messages.length;

  return (
    <>
      {/* Toggle Button - Always visible on right edge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-50",
          "h-24 w-6 flex items-center justify-center",
          "bg-black/[0.03] dark:bg-white/[0.06] backdrop-blur-lg",
          "border border-r-0 border-black/[0.08] dark:border-white/[0.1]",
          "rounded-l-lg",
          "hover:bg-black/[0.06] dark:hover:bg-white/[0.1]",
          "transition-all duration-200",
          "hidden md:flex" // Hide on mobile, show on desktop
        )}
        style={isOpen ? { right: `${sidebarWidth}px` } : undefined}
      >
        {isOpen ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <ChevronLeft className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </button>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={isResizing ? { duration: 0 } : { type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed right-3 top-3 bottom-3 z-40",
              "flex flex-col relative overflow-hidden",
              // Liquid Glass styling matching left sidebar
              "rounded-2xl",
              "bg-white/92 dark:bg-[hsl(0_0%_12%/0.55)]",
              "backdrop-blur-[28px] backdrop-saturate-[160%]",
              "border border-black/[0.08] dark:border-white/[0.1]",
              "shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]",
              "dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)]",
              // Top edge highlight for glass refraction effect
              "before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:z-10",
              "before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent",
              "dark:before:via-white/20"
            )}
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* Resize handle - on left edge for right sidebar */}
            <div
              onMouseDown={handleMouseDown}
              className={cn(
                "absolute top-0 bottom-0 w-1 cursor-ew-resize z-20",
                "left-0",
                // Visible handle indicator
                "bg-transparent hover:bg-primary/20 active:bg-primary/30",
                "transition-colors duration-150",
                // Wider hit area
                "before:absolute before:inset-y-0 before:-left-1 before:-right-1",
                isResizing && "bg-primary/30"
              )}
            />
            {/* Header */}
            <div className="p-4 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Messages</h3>
                </div>
                <Link to={`/symbol/${symbol}/messages`}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                    View All
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 pr-8 text-xs glass-input"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages List */}
            <ScrollArea className="flex-1 px-3 py-3">
              <div className="space-y-2">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))
                ) : filteredMessages.length > 0 ? (
                  filteredMessages.map((msg) => (
                    <CondensedMessageCard
                      key={msg.id}
                      user={msg.user}
                      content={msg.content}
                      sentiment={msg.sentiment}
                      time={msg.time}
                      searchTerm={searchTerm}
                    />
                  ))
                ) : searchTerm ? (
                  <div className="text-center py-8">
                    <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No messages matching "{searchTerm}"</p>
                    <button
                      onClick={() => setSearchTerm("")}
                      className="text-xs text-primary mt-2 hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No messages available</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t border-black/[0.04] dark:border-white/[0.06]">
              <p className="text-[10px] text-muted-foreground text-center">
                {searchTerm ? (
                  <>Found {displayCount} matching messages</>
                ) : (
                  <>Showing {displayCount} of {totalCount} messages</>
                )}
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
}
