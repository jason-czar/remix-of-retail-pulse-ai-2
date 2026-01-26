import { cn } from "@/lib/utils";

export type DecisionLens = 'summary' | 'corporate-strategy' | 'earnings' | 'ma' | 'capital-allocation' | 'leadership-change' | 'strategic-pivot' | 'product-launch' | 'activist-risk';

interface DecisionLensSelectorProps {
  value: DecisionLens;
  onChange: (lens: DecisionLens) => void;
}

const lensOptions: {
  value: DecisionLens;
  label: string;
}[] = [{
  value: 'summary',
  label: 'Summary'
}, {
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
  return <div className="inline-flex items-center gap-1.5 rounded-full py-1.5 px-[10px] overflow-x-auto md:mx-0 scrollbar-hide bg-muted/60 backdrop-blur-xl border border-border/40 dark:glass-tabs-list mx-[4px] shadow-none">
      {lensOptions.map(option => <button key={option.value} className={cn("inline-flex items-center justify-center whitespace-nowrap px-4 py-1.5 text-xs font-medium rounded-full ring-offset-background transition-all duration-200 shrink-0", value === option.value ? "bg-background text-foreground shadow-md dark:shadow-[0_4px_16px_hsl(240_15%_0%/0.5),inset_0_1px_0_hsl(0_0%_100%/0.15)] dark:bg-[linear-gradient(180deg,hsl(0_0%_100%/0.12)_0%,hsl(0_0%_100%/0.06)_100%)] dark:border dark:border-white/12 dark:backdrop-blur-md" : "text-muted-foreground hover:text-foreground/80 hover:bg-white/5")} onClick={() => onChange(option.value)}>
          {option.label}
        </button>)}
    </div>;
}

export function getLensDisplayName(lens: DecisionLens): string {
  const option = lensOptions.find(o => o.value === lens);
  return option?.label || 'Summary';
}

export function getLensDecisionQuestion(lens: DecisionLens): string {
  const questions: Record<DecisionLens, string> = {
    'summary': 'What is the current psychological state of retail investors?',
    'corporate-strategy': 'How do retail investors perceive management\'s strategic direction?',
    'earnings': 'What are retail expectations around financial performance?',
    'ma': 'Is there meaningful speculation about acquisition activity?',
    'capital-allocation': 'How do investors view shareholder return priorities?',
    'leadership-change': 'What is retail sentiment on management quality and stability?',
    'strategic-pivot': 'Are investors anticipating major business model changes?',
    'product-launch': 'How is the market receiving new products or innovation pipeline?',
    'activist-risk': 'Is there meaningful activist involvement or governance concern?',
  };
  return questions[lens];
}

export function getLensPromptContext(lens: DecisionLens): string {
  const contexts: Record<DecisionLens, string> = {
    'summary': `Provide a high-level synthesis of retail sentiment and psychological state.

Focus on:
- Dominant emotions and collective mood (fear, greed, confusion, conviction)
- Consensus vs fragmentation in views
- Near-term expectations, frustrations, or catalysts

Explicitly avoid:
- Strategic interpretation or long-term positioning
- Capital allocation judgments
- Specific earnings metrics`,
    'corporate-strategy': `Focus strictly on perceived corporate strategy and long-term competitive positioning.

Highlight:
- How investors interpret management's strategic intent and vision
- Views on competitive moats, ecosystem control, or market position
- Whether strategic moves are seen as visionary, defensive, or reactive

Explicitly avoid:
- Short-term price action or trading sentiment
- Earnings beats/misses (unless directly tied to strategy)
- Emotional complaints unless they challenge strategic narrative`,
    'earnings': `Focus on earnings-related discussion and financial performance expectations.

Highlight:
- Revenue, margins, guidance, or segment performance mentions
- Gap between expectations and perceived outcomes
- Forward earnings narratives and guidance interpretation

Explicitly avoid:
- Strategic positioning unrelated to financials
- Product discussions unless tied to revenue impact

If investors are NOT discussing earnings meaningfully, state this and note what they are focused on instead.`,
    'ma': `Focus on merger and acquisition speculation, deal activity, and consolidation themes.

Highlight:
- Specific deal rumors, buyout targets, or acquirer mentions
- Views on merger synergies, valuations, or strategic fit
- Concerns about overpaying or integration risks

Explicitly avoid:
- General competitive positioning (unless about being acquired/acquiring)
- Product launches or earnings performance
- Leadership changes (unless tied to deal probability)`,
    'capital-allocation': `Focus on capital deployment and shareholder return expectations.

Highlight:
- Discussion of buybacks, dividends, or special returns
- Views on debt management or balance sheet priorities
- Opinions on capex spending, investment levels, or cash hoarding

Explicitly avoid:
- Earnings performance metrics (unless about cash generation)
- Strategic pivots or M&A speculation`,
    'leadership-change': `Focus on leadership perception, executive changes, and management credibility.

Highlight:
- Discussion of CEO/executive performance or competence
- Succession planning concerns or transition speculation
- Management credibility on guidance or communication

Explicitly avoid:
- Strategic or product decisions (unless directly questioning leadership competence)
- Earnings metrics
- Activist involvement (separate lens)`,
    'strategic-pivot': `Focus on strategic pivots, divestitures, and business model transformation.

Highlight:
- Discussion of segment sales, spinoffs, or restructuring
- Views on business model changes or market exits
- Concerns about execution risk or strategic clarity

Explicitly avoid:
- Regular product launches or earnings
- Leadership changes (unless driving the pivot)`,
    'product-launch': `Focus on new product launches, innovation cycles, and market reception.

Highlight:
- Discussion of specific upcoming or recent product releases
- Views on innovation quality, market fit, or differentiation
- Concerns about delays, quality issues, or market reception

Explicitly avoid:
- Earnings metrics (unless directly tied to product revenue)
- Strategic repositioning beyond product scope`,
    'activist-risk': `Focus on activist investor involvement, proxy activity, and governance challenges.

Highlight:
- Discussion of specific activist investors or campaigns
- Views on board composition or governance quality
- Concerns about proxy fights, shareholder proposals, or forced changes

Explicitly avoid:
- General leadership criticism (unless activist-driven)
- Strategic disagreements from regular investors`,
  };
  return contexts[lens];
}