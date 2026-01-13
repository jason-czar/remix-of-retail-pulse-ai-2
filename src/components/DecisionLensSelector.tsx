import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DecisionLens = 
  | 'corporate-strategy'
  | 'earnings'
  | 'ma'
  | 'capital-allocation'
  | 'leadership-change'
  | 'strategic-pivot'
  | 'product-launch'
  | 'activist-risk';

interface DecisionLensSelectorProps {
  value: DecisionLens;
  onChange: (lens: DecisionLens) => void;
}

const lensOptions: { value: DecisionLens; label: string }[] = [
  { value: 'corporate-strategy', label: 'Corporate Strategy Insights' },
  { value: 'earnings', label: 'Earnings' },
  { value: 'ma', label: 'M&A' },
  { value: 'capital-allocation', label: 'Capital Allocation' },
  { value: 'leadership-change', label: 'Leadership Change' },
  { value: 'strategic-pivot', label: 'Strategic Pivot / Divestiture' },
  { value: 'product-launch', label: 'Product Launch' },
  { value: 'activist-risk', label: 'Activist Risk' },
];

export function DecisionLensSelector({ value, onChange }: DecisionLensSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {lensOptions.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          className={cn(
            "text-xs transition-all",
            value === option.value && "shadow-sm"
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
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
    'activist-risk': 'Focus on activist investor involvement, proxy fights, board challenges, and shareholder activism. Highlight discussions about activist campaigns and governance concerns.',
  };
  return contexts[lens];
}
