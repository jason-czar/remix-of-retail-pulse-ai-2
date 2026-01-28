import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAskDeriveStreet } from "@/contexts/AskDeriveStreetContext";
import { useAskDeriveStreetStream } from "@/hooks/use-ask-derive-street";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";

const STARTER_PROMPTS = [
  "Why is {SYMBOL} consolidating here?",
  "What could cause a breakout?",
  "What risks are retail ignoring?",
  "What changed today?",
  "How do retail traders feel about earnings?",
  "Is sentiment turning?",
];

interface AskDeriveStreetBarProps {
  className?: string;
}

export function AskDeriveStreetBar({ className }: AskDeriveStreetBarProps) {
  const { symbol, isOpen, openPanel, closePanel, panelWidth, isStreaming } = useAskDeriveStreet();
  const { sendMessage } = useAskDeriveStreetStream();
  const { state: sidebarState, sidebarWidth: leftSidebarWidth } = useSidebar();
  const [input, setInput] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();
  
  // Calculate offset to center in main content area (account for left sidebar)
  // When sidebar is expanded, shift right by half the sidebar width to center in remaining space
  const leftOffset = sidebarState === "expanded" ? leftSidebarWidth / 2 : 0;

  // Rotate placeholder prompts
  useEffect(() => {
    if (isFocused || input) return; // Don't rotate when focused or has input
    
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % STARTER_PROMPTS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isFocused, input]);

  const currentPlaceholder = STARTER_PROMPTS[placeholderIndex].replace("{SYMBOL}", symbol.toUpperCase());

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Edge tab component (like MessagesSidebar)
  const EdgeTab = () => (
    <button
      onClick={() => isOpen ? closePanel() : openPanel()}
      style={isOpen ? { right: `${panelWidth + 12}px` } : undefined}
      className={cn(
        "fixed right-0 z-50",
        // Position well below messages tab to avoid overlap
        "top-[calc(50%+120px)] -translate-y-1/2",
        "h-24 w-6 flex items-center justify-center",
        // Blue appearance
        "bg-primary/90 hover:bg-primary",
        "backdrop-blur-lg",
        "border border-r-0 border-primary/20",
        "rounded-l-lg",
        "shadow-[0_4px_12px_rgba(0,113,227,0.3)]",
        "hover:shadow-[0_4px_16px_rgba(0,113,227,0.4)]",
        "transition-all duration-200",
        "hidden md:flex" // Hide on mobile, show on desktop
      )}
    >
      {isOpen ? (
        <ChevronRight className="h-4 w-4 text-white" />
      ) : (
        <div className="flex flex-col items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-white" />
          <ChevronLeft className="h-3 w-3 text-white" />
        </div>
      )}
    </button>
  );

  // When panel is open, only show the edge tab
  if (isOpen) {
    return <EdgeTab />;
  }

  return (
    <>
      {/* Edge tab toggle */}
      <EdgeTab />
      
      {/* Input bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={!isMobile ? { left: `calc(50% + ${leftOffset}px)` } : undefined}
        className={cn(
          "fixed z-40",
          // Position: centered in main content area
          isMobile 
            ? "bottom-20 left-4 right-4" 
            : "bottom-6 -translate-x-1/2 w-full max-w-xl flex flex-col items-center",
          className
        )}
      >
        {/* Starter prompt chips - hidden for now */}
        <div
          className={cn(
            "relative flex items-end gap-2 p-2 w-full",
            // Liquid Glass styling
            "rounded-2xl",
            "bg-white/92 dark:bg-[hsl(0_0%_12%/0.55)]",
            "backdrop-blur-[28px] backdrop-saturate-[160%]",
            "border border-black/[0.08] dark:border-white/[0.1]",
            "shadow-[0_8px_32px_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.05)]",
            "dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)]",
            // Focus ring
            isFocused && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
          )}
        >
          {/* Brand icon */}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0 mb-0.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>

          {/* Input area */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={currentPlaceholder}
              rows={1}
              className={cn(
                "w-full resize-none bg-transparent",
                "text-sm leading-relaxed",
                "placeholder:text-muted-foreground/60",
                "focus:outline-none",
                "min-h-[36px] max-h-[120px] py-2 px-1"
              )}
              disabled={isStreaming}
            />
          </div>

          {/* Send button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
            className={cn(
              "h-8 w-8 shrink-0 rounded-full mb-0.5",
              "bg-primary/10 hover:bg-primary/20",
              "text-primary",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "transition-all duration-200"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Subtle hint text */}
        <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5 px-2">
          Ask about {symbol} • Grounded in DeriveStreet intelligence
        </p>
      </motion.div>
    </>
  );
}
