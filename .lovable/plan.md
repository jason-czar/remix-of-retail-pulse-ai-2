
# Professional UI Color Consolidation Plan

## Problem Analysis
The current interface uses 5+ distinct color families (green, red, amber, teal, plus severity gradient), creating visual noise that detracts from a polished SaaS appearance.

## Design Approach
Adopt a **monochromatic neutral palette** with the primary brand color (blue) used sparingly for interactive elements. All insight cards will use neutral backgrounds with subtle borders instead of semantic color coding.

---

## Changes

### 1. Score Tiles (DecisionQuestionHeader.tsx)
**Current**: Dynamic severity-based colored backgrounds/borders/glows  
**New**: Uniform neutral glass backgrounds with only the **score number** colored
- Remove colored gradients, borders, and glow effects from tile backgrounds
- Use subtle neutral glass styling (matching existing `.glass-card` pattern)
- Keep severity colors ONLY for the score text itself (81, 78, 30 numbers)

### 2. Insight Cards (LensReadinessCard.tsx)
**Current**: 4 cards with distinct colored backgrounds (amber, teal, red, green)  
**New**: Uniform neutral glass cards with subtle differentiation
- **Key Concerns**: Neutral glass background, keep amber dot bullets
- **Recommended Actions**: Neutral glass background, keep blue dot bullets
- **Blocking**: Neutral glass background, neutral badges with subtle red text
- **Supportive**: Neutral glass background, neutral badges with subtle green text
- Remove colored gradients, glow accents, and heavy colored borders

### 3. Timing Badge (DecisionQuestionHeader.tsx)
**Current**: Colored background based on timing (proceed/delay/avoid)  
**New**: Neutral outline badge with subtle icon color
- Use `variant="outline"` styling
- Keep semantic icon colors but remove background tinting

### 4. Confidence Badge 
**Current**: Colored based on confidence level  
**New**: Keep as-is (it's already subtle and informational)

---

## Visual Result
- Score numbers remain color-coded (green for good, red for bad) for quick scanning
- Cards use consistent neutral glass styling creating a cohesive, premium feel
- Reduced visual noise while preserving data hierarchy
- Professional SaaS aesthetic aligned with Apple Liquid Glass principles

---

## Files to Modify
1. `src/components/DecisionQuestionHeader.tsx` - Score tiles and timing badge
2. `src/components/LensReadinessCard.tsx` - All 4 insight cards
