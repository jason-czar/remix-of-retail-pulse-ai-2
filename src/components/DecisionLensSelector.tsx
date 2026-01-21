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
  return (
    <div className="inline-flex items-center gap-1 py-1.5 px-[7px] overflow-x-auto md:mx-0 scrollbar-hide glass-tabs-list mx-[4px]">
      {lensOptions.map(option => (
        <button 
          key={option.value} 
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap px-[10px] py-[7px] text-sm font-normal rounded-full transition-all duration-200 shrink-0",
            value === option.value 
              ? "glass-tabs-trigger-active text-foreground" 
              : "text-muted-foreground hover:text-foreground/80"
          )} 
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
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