import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const STARTER_PROMPTS = [
  "Why is {SYMBOL} consolidating here?",
  "What could cause a breakout?",
  "What risks are retail ignoring?",
  "What changed today?",
  "How do traders feel about earnings?",
  "Is sentiment turning?",
];

interface StarterPromptsProps {
  symbol: string;
  onSelect: (prompt: string) => void;
  className?: string;
}

export function StarterPrompts({ symbol, onSelect, className }: StarterPromptsProps) {
  const prompts = STARTER_PROMPTS.map((p) =>
    p.replace("{SYMBOL}", symbol.toUpperCase())
  );

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs text-muted-foreground text-center">
        Try asking:
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {prompts.slice(0, 4).map((prompt, index) => (
          <motion.button
            key={prompt}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect(prompt)}
            className={cn(
              "px-3 py-1.5 text-xs rounded-full",
              "bg-black/[0.03] dark:bg-white/[0.06]",
              "border border-black/[0.04] dark:border-white/[0.06]",
              "text-muted-foreground",
              "hover:bg-primary/10 hover:text-primary hover:border-primary/20",
              "transition-colors duration-200",
              "max-w-[200px] truncate"
            )}
          >
            {prompt}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
