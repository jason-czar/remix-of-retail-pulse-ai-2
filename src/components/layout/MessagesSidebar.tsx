import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Clock, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

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

function CondensedMessageCard({ user, content, sentiment, time }: Omit<Message, 'id' | 'emotions'>) {
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
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{content}</p>
      <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-1.5">
        <Clock className="h-2.5 w-2.5" />
        {time}
      </span>
    </div>
  );
}

export function MessagesSidebar({ symbol, messages, isLoading }: MessagesSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

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
          isOpen && "right-[280px] md:right-[320px]"
        )}
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
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed right-3 top-3 bottom-3 z-40",
              "w-[280px] md:w-[320px]",
              "flex flex-col",
              // Liquid Glass styling matching left sidebar
              "rounded-2xl",
              "bg-white/92 dark:bg-[hsl(0_0%_12%/0.55)]",
              "backdrop-blur-[28px] backdrop-saturate-[160%]",
              "border border-black/[0.08] dark:border-white/[0.1]",
              "shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]",
              "dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)]",
              // Top edge highlight for glass refraction effect
              "before:absolute before:inset-x-0 before:top-0 before:h-[1px]",
              "before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent",
              "dark:before:via-white/20"
            )}
          >
            {/* Header */}
            <div className="p-4 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
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
            </div>

            {/* Messages List */}
            <ScrollArea className="flex-1 px-3 py-3">
              <div className="space-y-2">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))
                ) : messages.length > 0 ? (
                  messages.slice(0, 10).map((msg) => (
                    <CondensedMessageCard
                      key={msg.id}
                      user={msg.user}
                      content={msg.content}
                      sentiment={msg.sentiment}
                      time={msg.time}
                    />
                  ))
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
                Showing latest {Math.min(messages.length, 10)} of {messages.length} messages
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
