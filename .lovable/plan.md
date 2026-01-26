
# Intelligence Summary Prompt Architecture Upgrade (Refined)

## Overview

Transform the Intelligence Summary from a sentiment summarization tool into a **decision intelligence system** where each lens answers a specific executive question with signal strength awareness and uncertainty visibility.

---

## Key Refinements from Feedback

| Issue | Solution |
|-------|----------|
| **No signal strength distinction** | Add system prompt line to distinguish dominant vs minority-but-strategic views |
| **Output skeleton lacks actor differentiation** | Sentence 2 now identifies *who* holds opposing views (traders vs holders, bulls vs skeptics) |
| **Confidence logic favors volume over coherence** | Add narrative concentration (dominant theme share) to confidence calculation |
| **Decision Question not visible in UI** | Display the specific question each lens answers directly in the card |
| **Token limit concern** | Keep at 384 but enforce strict 3-sentence output structure |

---

## Implementation Details

### 1. System Prompt Upgrade

**File:** `supabase/functions/generate-lens-summary/index.ts`

Replace the current system prompt with:

```
You are a senior equity research analyst producing decision-support intelligence for institutional users.

Write with precision and compression. Avoid generic sentiment language.

Prioritize:
- What is CHANGING in retail perception
- Where investor expectations DIVERGE  
- Why this matters for forward-looking decisions

Distinguish between dominant signals and minority-but-strategically-relevant views.
Do not give equal weight to all narratives.

Each sentence should introduce a distinct, decision-relevant insight.
Do NOT restate facts unless they are being actively debated.

If discussion is sparse or inconclusive for this lens, state that clearly and briefly note what investors ARE focused on instead.
```

---

### 2. Restructured Lens Contexts with Guardrails

Each lens now includes:
- **Decision Question** (displayed in UI)
- **Focus Areas** (inclusions)
- **Explicit Exclusions** (prevents lens bleed)

#### Summary
**Decision Question:** "What is the current psychological state of retail investors?"

Focus on:
- Dominant emotions and collective mood (fear, greed, confusion, conviction)
- Consensus vs fragmentation in views
- Near-term expectations, frustrations, or catalysts

Explicitly avoid:
- Strategic interpretation or long-term positioning
- Capital allocation judgments
- Specific earnings metrics

#### Corporate Strategy Insights
**Decision Question:** "How do retail investors perceive management's strategic direction?"

Focus on:
- How investors interpret management's strategic intent and vision
- Views on competitive moats, ecosystem control, or market position
- Whether strategic moves are seen as visionary, defensive, or reactive

Explicitly avoid:
- Short-term price action or trading sentiment
- Earnings beats/misses (unless directly tied to strategy)
- Emotional complaints unless they challenge strategic narrative

#### Earnings
**Decision Question:** "What are retail expectations around financial performance?"

Focus on:
- Revenue, margins, guidance, or segment performance mentions
- Gap between expectations and perceived outcomes
- Forward earnings narratives and guidance interpretation

Explicitly avoid:
- Strategic positioning unrelated to financials
- Product discussions unless tied to revenue impact

Absence clause: If investors are NOT discussing earnings meaningfully, state this and note what they are focused on instead.

#### M&A
**Decision Question:** "Is there meaningful speculation about acquisition activity?"

Focus on:
- Specific deal rumors, buyout targets, or acquirer mentions
- Views on merger synergies, valuations, or strategic fit
- Concerns about overpaying or integration risks

Explicitly avoid:
- General competitive positioning (unless about being acquired/acquiring)
- Product launches or earnings performance
- Leadership changes (unless tied to deal probability)

#### Capital Allocation
**Decision Question:** "How do investors view shareholder return priorities?"

Focus on:
- Discussion of buybacks, dividends, or special returns
- Views on debt management or balance sheet priorities
- Opinions on capex spending, investment levels, or cash hoarding

Explicitly avoid:
- Earnings performance metrics (unless about cash generation)
- Strategic pivots or M&A speculation

#### Leadership Change
**Decision Question:** "What is retail sentiment on management quality and stability?"

Focus on:
- Discussion of CEO/executive performance or competence
- Succession planning concerns or transition speculation
- Management credibility on guidance or communication

Explicitly avoid:
- Strategic or product decisions (unless questioning leadership competence)
- Earnings metrics
- Activist involvement (separate lens)

#### Strategic Pivot / Divestiture
**Decision Question:** "Are investors anticipating major business model changes?"

Focus on:
- Discussion of segment sales, spinoffs, or restructuring
- Views on business model changes or market exits
- Concerns about execution risk or strategic clarity

Explicitly avoid:
- Regular product launches or earnings
- Leadership changes (unless driving the pivot)

#### Product Launch
**Decision Question:** "How is the market receiving new products or innovation pipeline?"

Focus on:
- Discussion of specific upcoming or recent product releases
- Views on innovation quality, market fit, or differentiation
- Concerns about delays, quality issues, or market reception

Explicitly avoid:
- Earnings metrics (unless directly tied to product revenue)
- Strategic repositioning beyond product scope

#### Activist Risk
**Decision Question:** "Is there meaningful activist involvement or governance concern?"

Focus on:
- Discussion of specific activist investors or campaigns
- Views on board composition or governance quality
- Concerns about proxy fights, shareholder proposals, or forced changes

Explicitly avoid:
- General leadership criticism (unless activist-driven)
- Strategic disagreements from regular investors

---

### 3. Enhanced Output Skeleton with Actor Differentiation

Append to each lens prompt:

```
Structure your response as:
Sentence 1: Core retail narrative specific to this lens
Sentence 2: Source of tension or asymmetry—identify WHO holds opposing views (e.g., traders vs long-term holders, bulls vs skeptics)
Sentence 3 (optional): Forward-looking implication for decision-makers

If views are uniform, note the consensus strength in Sentence 2.
Limit output to exactly 3 sentences maximum.
```

---

### 4. Confidence Signal with Narrative Concentration

**File:** `supabase/functions/generate-lens-summary/index.ts`

Calculate confidence using both volume AND coherence:

```typescript
// Analyze message relevance and concentration
const relevantMessages = messages.filter(m => isRelevantToLens(m, lens));
const relevantRatio = relevantMessages.length / messages.length;

// Calculate dominant theme concentration
const themeCounts = countNarrativeThemes(relevantMessages);
const topThemeShare = Math.max(...Object.values(themeCounts)) / relevantMessages.length;

// Confidence logic incorporating concentration
let confidence: "high" | "moderate" | "low";
if (relevantRatio >= 0.35 && topThemeShare >= 0.40) {
  confidence = "high";
} else if (relevantRatio >= 0.20 && topThemeShare >= 0.25) {
  confidence = "moderate";
} else {
  confidence = "low";
}

// Return with response
return { 
  summary, 
  cached: false, 
  messageCount: messages.length,
  confidence,
  relevantCount: relevantMessages.length,
  dominantThemeShare: topThemeShare
};
```

The `isRelevantToLens()` function will use keyword matching per lens to estimate topic relevance without an extra AI call.

---

### 5. UI: Display Decision Question

**File:** `src/pages/SymbolPage.tsx`

Add the decision question below the lens badge:

```tsx
<Card className="p-4 md:p-5 glass-card flex flex-col">
  <div className="flex items-center justify-between gap-2 mb-2">
    <div className="flex items-center gap-2 flex-wrap">
      <h3 className="font-semibold text-sm md:text-base">Intelligence Summary</h3>
      <Badge variant="outline" className="text-[10px] md:text-xs">
        {getLensDisplayName(decisionLens)}
      </Badge>
      {lensSummaryData?.confidence && (
        <ConfidenceBadge 
          level={lensSummaryData.confidence} 
          tooltipContent={`Based on ${lensSummaryData.relevantCount || '—'} relevant messages`}
        />
      )}
    </div>
    <Button variant="ghost" size="sm" onClick={handleRegenerate} ...>
      <RefreshCw ... />
    </Button>
  </div>
  
  {/* Decision Question - anchors interpretation */}
  <p className="text-xs text-muted-foreground/70 mb-3 italic">
    {getLensDecisionQuestion(decisionLens)}
  </p>
  
  {/* Summary content */}
  ...
</Card>
```

---

### 6. Add Helper Functions

**File:** `src/components/DecisionLensSelector.tsx`

Export a new function for decision questions:

```typescript
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
```

---

### 7. Update Hook Return Type

**File:** `src/hooks/use-decision-lens-summary.ts`

```typescript
return data as { 
  summary: string; 
  cached: boolean;
  messageCount?: number;
  confidence?: "high" | "moderate" | "low";
  relevantCount?: number;
  dominantThemeShare?: number;
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-lens-summary/index.ts` | New system prompt, restructured lens contexts with guardrails, output skeleton, confidence calculation with narrative concentration, return confidence in response |
| `src/components/DecisionLensSelector.tsx` | Add `getLensDecisionQuestion()` export, update `getLensPromptContext()` for parity |
| `src/hooks/use-decision-lens-summary.ts` | Update return type to include confidence fields |
| `src/pages/SymbolPage.tsx` | Display Decision Question in card, add ConfidenceBadge next to title |

---

## Expected Outcomes

| Before | After |
|--------|-------|
| "People are saying X" | "This implies Y for decision Z" |
| Lenses overlap in themes | Each lens has distinct guardrails |
| No signal weighting | Dominant vs minority views explicitly distinguished |
| Unknown data quality | Visible confidence badge with concentration-aware scoring |
| No anchoring for users | Decision Question shown in UI to frame interpretation |
| Volume-only confidence | Narrative concentration included in scoring |

---

## Technical Notes

- **Token limit**: Kept at 384 but with strict 3-sentence enforcement in the prompt
- **Keyword matching**: Simple pattern matching for relevance estimation (no extra AI call)
- **Backward compatible**: Confidence fields are optional in the response type
- **Cache unchanged**: 30-minute expiry remains; confidence calculated at generation time

