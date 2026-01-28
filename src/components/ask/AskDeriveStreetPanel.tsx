import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, PanelRightClose, Send, SquarePen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAskDeriveStreet } from "@/contexts/AskDeriveStreetContext";
import { useAskDeriveStreetStream } from "@/hooks/use-ask-derive-street";
import { useIsMobile } from "@/hooks/use-mobile";
import { ConversationMessageComponent } from "./ConversationMessage";
import { StarterPrompts } from "./StarterPrompts";
import { ChatHistorySidebar } from "./ChatHistorySidebar";

const MIN_WIDTH = 320;
const MAX_WIDTH = 480;
const HISTORY_WIDTH = 200;

export function AskDeriveStreetPanel() {
  const {
    isOpen,
    closePanel,
    panelWidth,
    setPanelWidth,
    conversation,
    isStreaming,
    symbol,
    setSymbol,
    clearConversation,
    isHistoryOpen,
    setIsHistoryOpen,
    deleteConversationForSymbol,
  } = useAskDeriveStreet();
  const { sendMessage, cancelStream } = useAskDeriveStreetStream();

  const [input, setInput] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Calculate total width including history sidebar
  const totalWidth = isHistoryOpen ? panelWidth + HISTORY_WIDTH : panelWidth;

  // Auto-scroll to bottom when new messages arrive or panel opens
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        const scrollElement = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [conversation, isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current && !isMobile) {
      inputRef.current.focus();
    }
  }, [isOpen, isMobile]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const historyOffset = isHistoryOpen ? HISTORY_WIDTH : 0;
      const newWidth = window.innerWidth - e.clientX - 12 - historyOffset;
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, isHistoryOpen, setPanelWidth]);

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStarterSelect = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleNewChat = () => {
    clearConversation();
  };

  const handleSelectSymbol = (selectedSymbol: string) => {
    setSymbol(selectedSymbol);
    setIsHistoryOpen(false);
  };

  const handleDeleteConversation = (targetSymbol: string) => {
    deleteConversationForSymbol(targetSymbol);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Mobile: Full screen overlay
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />

            {/* Full screen panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn(
                "fixed inset-x-0 bottom-0 top-16 z-50",
                "flex flex-col",
                "bg-background",
                "rounded-t-2xl",
                "shadow-[0_-8px_32px_rgba(0,0,0,0.15)]"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className="h-8 w-8"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  <div>
                    <h3 className="font-semibold text-sm">Ask DeriveStreet</h3>
                    <p className="text-xs text-muted-foreground">{symbol}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNewChat}
                    className="h-8 w-8"
                  >
                    <SquarePen className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={closePanel}>
                    <PanelRightClose className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* History sidebar for mobile */}
              <AnimatePresence>
                {isHistoryOpen && (
                  <ChatHistorySidebar
                    currentSymbol={symbol}
                    onSelectSymbol={handleSelectSymbol}
                    onDeleteConversation={handleDeleteConversation}
                  />
                )}
              </AnimatePresence>

              {/* Messages */}
              {!isHistoryOpen && (
                <>
                  <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
                    {conversation.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-8">
                        <Sparkles className="h-10 w-10 text-primary/30 mb-4" />
                        <p className="text-sm text-muted-foreground text-center mb-6">
                          Ask anything about {symbol}'s sentiment, narratives, or market psychology.
                        </p>
                        <StarterPrompts symbol={symbol} onSelect={handleStarterSelect} />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {conversation.map((msg) => (
                          <ConversationMessageComponent key={msg.id} message={msg} />
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-4 border-t border-border bg-background/80 backdrop-blur-lg">
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Ask about ${symbol}...`}
                        rows={1}
                        className={cn(
                          "flex-1 resize-none bg-muted/50 rounded-xl px-3 py-2",
                          "text-sm leading-relaxed",
                          "placeholder:text-muted-foreground/60",
                          "focus:outline-none focus:ring-2 focus:ring-primary/30",
                          "min-h-[40px] max-h-[120px]"
                        )}
                        disabled={isStreaming}
                      />
                      <Button
                        size="icon"
                        onClick={handleSubmit}
                        disabled={!input.trim() || isStreaming}
                        className="h-10 w-10 rounded-xl"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: Side panel
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: "100%", opacity: 0.8 }}
          animate={{ x: 0, width: totalWidth, opacity: 1 }}
          exit={{ x: "100%", opacity: 0.8 }}
          transition={
            isResizing
              ? { duration: 0 }
              : { 
                  type: "spring", 
                  damping: 18, 
                  stiffness: 280,
                  mass: 0.8
                }
          }
          className={cn(
            "fixed right-3 top-3 bottom-3 z-40",
            "flex overflow-hidden",
            // Liquid Glass styling matching MessagesSidebar
            "rounded-2xl",
            "bg-white/92 dark:bg-[hsl(0_0%_12%/0.55)]",
            "backdrop-blur-[28px] backdrop-saturate-[160%]",
            "border border-black/[0.08] dark:border-white/[0.1]",
            "shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]",
            "dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)]",
            // Top edge highlight
            "before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:z-10",
            "before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent",
            "dark:before:via-white/20"
          )}
          style={{ width: `${totalWidth}px` }}
        >
          {/* Resize handle */}
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "absolute top-0 bottom-0 w-1 cursor-ew-resize z-20",
              "left-0",
              "bg-transparent hover:bg-primary/20 active:bg-primary/30",
              "transition-colors duration-150",
              "before:absolute before:inset-y-0 before:-left-1 before:-right-1",
              isResizing && "bg-primary/30"
            )}
          />

          {/* History sidebar */}
          <AnimatePresence>
            {isHistoryOpen && (
              <ChatHistorySidebar
                currentSymbol={symbol}
                onSelectSymbol={handleSelectSymbol}
                onDeleteConversation={handleDeleteConversation}
              />
            )}
          </AnimatePresence>

          {/* Main chat area */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Header */}
            <div className="p-4 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className={cn(
                      "h-7 w-7",
                      isHistoryOpen && "bg-primary/10 text-primary"
                    )}
                  >
                    <Menu className="h-3.5 w-3.5" />
                  </Button>
                  <div>
                    <h3 className="font-semibold text-sm">Ask DeriveStreet</h3>
                    <p className="text-[10px] text-muted-foreground">{symbol} Intelligence</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNewChat}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title="New chat"
                  >
                    <SquarePen className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closePanel}
                    className="h-7 w-7"
                  >
                    <PanelRightClose className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-3 py-4" ref={scrollRef}>
              {conversation.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-6 w-6 text-primary/60" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mb-6 max-w-[200px]">
                    Ask about {symbol}'s sentiment, narratives, or psychology signals.
                  </p>
                  <StarterPrompts symbol={symbol} onSelect={handleStarterSelect} />
                </div>
              ) : (
                <div className="space-y-4">
                  {conversation.map((msg) => (
                    <ConversationMessageComponent key={msg.id} message={msg} />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Input area */}
            <div className="p-3 border-t border-black/[0.04] dark:border-white/[0.06]">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask about ${symbol}...`}
                  rows={1}
                  className={cn(
                    "flex-1 resize-none",
                    "bg-black/[0.03] dark:bg-white/[0.06] rounded-xl px-3 py-2",
                    "text-sm leading-relaxed",
                    "placeholder:text-muted-foreground/60",
                    "focus:outline-none focus:ring-2 focus:ring-primary/30",
                    "min-h-[36px] max-h-[120px]",
                    "border border-transparent focus:border-primary/20"
                  )}
                  disabled={isStreaming}
                />
                <Button
                  size="icon"
                  onClick={handleSubmit}
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    "h-9 w-9 rounded-xl shrink-0",
                    "bg-primary hover:bg-primary/90",
                    "disabled:opacity-40"
                  )}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
