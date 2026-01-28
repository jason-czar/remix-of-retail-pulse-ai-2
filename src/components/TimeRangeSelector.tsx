import { cn } from "@/lib/utils";

export type TimeRange = '1H' | '6H' | '1D' | '24H' | '7D' | '30D';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}

const TIME_RANGES: readonly TimeRange[] = ['1H', '6H', '1D', '24H', '7D', '30D'];

const LABELS: Record<TimeRange, string> = {
  '1H': '1H',
  '6H': '6H',
  '1D': 'Today',
  '24H': '24H',
  '7D': '7D',
  '30D': '30D'
};

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className={cn(
      "relative inline-flex items-center justify-center gap-1.5 rounded-2xl py-2 px-3 overflow-x-auto scrollbar-hide",
      // Liquid Glass styling - subtle and seamless
      "bg-white/45 dark:bg-[hsl(0_0%_15%/0.45)]",
      "backdrop-blur-[20px] backdrop-saturate-[140%]",
      "border border-black/[0.04] dark:border-white/[0.06]",
      // Minimal shadow - just enough depth without boxy appearance
      "shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
      "dark:shadow-none"
    )}>
      {TIME_RANGES.map(range => (
        <button
          key={range}
          onClick={() => onChange(range)}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap px-4 py-1.5 text-xs font-medium rounded-full ring-offset-background transition-all duration-200 shrink-0",
            range === value
              ? [
                  // Light mode: frosted white with subtle depth
                  "bg-white text-foreground",
                  "shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]",
                  "border border-black/[0.06]",
                  // Dark mode: subtle glass elevation
                  "dark:bg-white/[0.12] dark:text-foreground",
                  "dark:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]",
                  "dark:border-white/[0.12]"
                ]
              : "text-muted-foreground hover:text-foreground/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
          )}
        >
          {LABELS[range]}
        </button>
      ))}
    </div>
  );
}
