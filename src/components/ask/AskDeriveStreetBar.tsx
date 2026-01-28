import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAskDeriveStreet } from "@/contexts/AskDeriveStreetContext";
import { useAskDeriveStreetStream } from "@/hooks/use-ask-derive-street";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";
import { useMessagesSidebar } from "@/contexts/MessagesSidebarContext";

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
  const { symbol, isOpen, isStreaming } = useAskDeriveStreet();
  const { sendMessage } = useAskDeriveStreetStream();
  const [input, setInput] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();
  
  // Get sidebar widths for proper centering
  const { state: sidebarState, sidebarWidth: leftSidebarWidth } = useSidebar();
  const { isOpen: messagesSidebarOpen, sidebarWidth: messagesSidebarWidth } = useMessagesSidebar();
  
  const isLeftExpanded = sidebarState === "expanded";
  const leftOffset = isLeftExpanded ? leftSidebarWidth + 12 : 64;
  const rightOffset = messagesSidebarOpen ? messagesSidebarWidth + 24 : 16;

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

  // Don't show bar when panel is open
  if (isOpen) return null;

  const handlePromptClick = (prompt: string) => {
    const resolvedPrompt = prompt.replace("{SYMBOL}", symbol.toUpperCase());
    sendMessage(resolvedPrompt);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={!isMobile ? { 
        left: `${leftOffset}px`, 
        right: `${rightOffset}px` 
      } : undefined}
      className={cn(
        "fixed z-40",
        // Position: centered at bottom, above footer
        isMobile 
          ? "bottom-20 left-4 right-4" 
          : "bottom-6 flex flex-col items-center",
        className
      )}
    >
      {/* Starter prompt chips */}
      <div className="flex flex-wrap gap-1.5 justify-center mb-2 px-2 max-w-xl">
        {STARTER_PROMPTS.slice(0, isMobile ? 3 : 4).map((prompt, index) => {
          const resolvedPrompt = prompt.replace("{SYMBOL}", symbol.toUpperCase());
          return (
            <motion.button
              key={prompt}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 + 0.1 }}
              onClick={() => handlePromptClick(prompt)}
              disabled={isStreaming}
              className={cn(
                "px-2.5 py-1 text-[11px] rounded-full",
                "bg-white/70 dark:bg-white/[0.08]",
                "backdrop-blur-sm",
                "border border-black/[0.06] dark:border-white/[0.08]",
                "text-muted-foreground",
                "hover:bg-primary/10 hover:text-primary hover:border-primary/20",
                "transition-colors duration-200",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "max-w-[160px] truncate"
              )}
            >
              {resolvedPrompt}
            </motion.button>
          );
        })}
      </div>

      <div
        className={cn(
          "relative flex items-end gap-2 p-2 w-full max-w-xl",
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
  );
}
