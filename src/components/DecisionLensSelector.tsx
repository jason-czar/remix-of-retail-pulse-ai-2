import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export type DecisionLens = 'corporate-strategy' | 'earnings' | 'ma' | 'capital-allocation' | 'leadership-change' | 'strategic-pivot' | 'product-launch' | 'activist-risk';
interface DecisionLensSelectorProps {
  value: DecisionLens;
  onChange: (lens: DecisionLens) => void;
}
const lensOptions: {
  value: DecisionLens;
  label: string;
}[] = [{
  value: 'corporate-strategy',
  label: 'Corporate Strategy Insights'
}, {
  value: 'earnings',
  label: 'Earnings'
}, {
  value: 'ma',
  label: 'M&A'
}, {
  value: 'capital-allocation',
  label: 'Capital Allocation'
}, {
  value: 'leadership-change',
  label: 'Leadership Change'
}, {
  value: 'strategic-pivot',
  label: 'Strategic Pivot / Divestiture'
}, {
  value: 'product-launch',
  label: 'Product Launch'
}, {
  value: 'activist-risk',
  label: 'Activist Risk'
}];
export function DecisionLensSelector({
  value,
  onChange
}: DecisionLensSelectorProps) {
  return <div className="inline-flex items-center gap-1.5 rounded-full p-1.5 overflow-x-auto md:mx-0 md:px-0 scrollbar-hide bg-muted/60 dark:bg-[linear-gradient(135deg,hsl(240_15%_25%/0.35)_0%,hsl(240_15%_18%/0.2)_100%)] backdrop-blur-xl border border-border/40 dark:border-white/15 shadow-sm dark:shadow-[0_8px_32px_hsl(240_15%_0%/0.4),inset_0_1px_0_hsl(0_0%_100%/0.1)] mx-[4px] px-[10px]">
      {lensOptions.map(option => <button key={option.value} className={cn("inline-flex items-center justify-center whitespace-nowrap px-4 py-1.5 text-xs font-medium rounded-full ring-offset-background transition-all duration-200 shrink-0", value === option.value ? "bg-background text-foreground shadow-md dark:shadow-[0_4px_16px_hsl(240_15%_0%/0.5),inset_0_1px_0_hsl(0_0%_100%/0.15)] dark:bg-[linear-gradient(180deg,hsl(0_0%_100%/0.12)_0%,hsl(0_0%_100%/0.06)_100%)] dark:border dark:border-white/12 dark:backdrop-blur-md" : "text-muted-foreground hover:text-foreground/80 hover:bg-white/5")} onClick={() => onChange(option.value)}>
          {option.label}
        </button>)}
    </div>;
}
export function getLensDisplayName(lens: DecisionLens): string {
  const option = lensOptions.find(o => o.value === lens);
  return option?.label || 'Corporate Strategy Insights';
}
export function getLensPromptContext(lens: DecisionLens): string {
  const contexts: Record<DecisionLens, string> = {
    'corporate-strategy': 'Focus on overall corporate strategy, competitive positioning, long-term vision, and strategic direction. Highlight themes around market leadership, competitive advantages, and business model evolution.',
    'earnings': 'Focus on earnings performance, revenue growth, profitability metrics, guidance, and financial results. Highlight discussions about quarterly results, beats/misses, and forward guidance.',
    'ma': 'Focus on merger and acquisition activity, potential takeover targets, deal rumors, and consolidation themes. Highlight discussions about buyout speculation, merger synergies, and acquisition targets.',
    'capital-allocation': 'Focus on capital allocation decisions including buybacks, dividends, debt management, and investment priorities. Highlight discussions about shareholder returns and capital deployment.',
    'leadership-change': 'Focus on executive changes, CEO transitions, board reshuffling, and management commentary. Highlight discussions about leadership quality and succession planning.',
    'strategic-pivot': 'Focus on strategic pivots, business divestitures, segment sales, and major business model changes. Highlight discussions about corporate restructuring and portfolio optimization.',
    'product-launch': 'Focus on new product launches, product cycles, innovation pipeline, and market reception. Highlight discussions about upcoming releases and product performance.',
    'activist-risk': 'Focus on activist investor involvement, proxy fights, board challenges, and shareholder activism. Highlight discussions about activist campaigns and governance concerns.'
  };
  return contexts[lens];
}