
# Plan: Soften Dark Mode Top-Edge Highlights Across All Glass Components

## Problem Identified
The visible white/light border at the top of cards in dark mode is caused by multiple CSS rules that still include `inset 0 1px 0` box-shadow highlights across various glass components. While the main `.glass-card` was updated, these highlights remain in:

- **Nested glass cards** (0.05 opacity)
- **Glass tabs list** (0.08 opacity)
- **Glass charts** (0.08 opacity + border-white/15)
- **Glass tiles** (0.06 opacity, 0.08 on hover)
- **Glass popovers** (0.08 opacity)
- **Glass buttons** (primary: 0.1, secondary: 0.06)

## Solution
Remove or dramatically reduce the `inset 0 1px 0` top-edge highlights from ALL dark mode glass components in `src/index.css` to create a consistent, subtle aesthetic.

## Technical Changes

### File: `src/index.css`

1. **Nested Glass Cards** (lines ~814-818)
   - Remove the inset highlight entirely from `.dark .glass-card .glass-card`

2. **Glass Tabs List** (lines ~638-645)
   - Remove `inset 0 1px 0` from `.dark .glass-tabs-list`
   - Reduce border opacity from 0.15 to 0.08

3. **Glass Charts** (lines ~695-701)
   - Remove `inset 0 1px 0` from `.dark .glass-chart`
   - Reduce border opacity from `border-white/15` to `border-white/[0.06]`

4. **Glass Tiles** (lines ~856-873)
   - Remove `inset 0 1px 0` from `.dark .glass-tile` and `.dark .glass-tile:hover`
   - Reduce border opacity from 0.1 to 0.06

5. **Glass Popovers** (lines ~673-679)
   - Remove `inset 0 1px 0` from `.dark .glass-popover`
   - Reduce border opacity from 0.15 to 0.08

6. **Glass Buttons** (lines ~450-510)
   - Remove inset highlights from `.dark .glass-button-primary` and `.dark .glass-button-secondary`
   - Keep buttons slightly more visible since they are interactive elements

## Expected Result
All glass components in dark mode will have uniformly subtle borders (6-8% opacity) with no visible top-edge "glow" line, matching the treatment previously applied to the main glass-card and glass-list-item components.
