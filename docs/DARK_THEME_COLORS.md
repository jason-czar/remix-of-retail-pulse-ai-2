# Dark Theme Color Migration Documentation

This document summarizes the dark theme color changes made to achieve a fully neutral gray palette.

## Overview

The dark theme was migrated from blue-tinted grays (HSL hue ~217-222) to pure neutral grays (HSL hue 0) for a cleaner, more modern aesthetic with pure black backgrounds.

---

## Core Background Colors

| Token | Before (Blue-tinted) | After (Neutral) | Notes |
|-------|---------------------|-----------------|-------|
| `--background` | `222 47% 6%` | `0 0% 0%` | Pure black |
| `--card` | `222 47% 8%` | `0 0% 8%` | Dark gray cards |
| `--popover` | `222 47% 8%` | `0 0% 8%` | Matches card |

---

## UI Surface Colors

| Token | Before | After | Notes |
|-------|--------|-------|-------|
| `--secondary` | `217 33% 17%` | `0 0% 14%` | Secondary buttons/surfaces |
| `--muted` | `217 33% 14%` | `0 0% 12%` | Muted backgrounds |
| `--muted-foreground` | `215 20% 55%` | `0 0% 55%` | Muted text |
| `--accent` | `217 33% 17%` | `0 0% 14%` | Accent highlights |

---

## Border & Input

| Token | Before | After | Notes |
|-------|--------|-------|-------|
| `--border` | `217 33% 17%` | `0 0% 16%` | Subtle card separation |
| `--input` | `217 33% 17%` | `0 0% 16%` | Input field borders |

---

## Primary Foreground

| Token | Before | After | Notes |
|-------|--------|-------|-------|
| `--primary-foreground` | `222 47% 6%` | `0 0% 6%` | Text on primary buttons |

---

## Sidebar Colors

| Token | Before | After | Notes |
|-------|--------|-------|-------|
| `--sidebar-background` | `222 47% 6%` | `0 0% 0%` | Matches main background |
| `--sidebar-accent` | `217 33% 14%` | `0 0% 12%` | Active/hover states |
| `--sidebar-border` | `217 33% 17%` | `0 0% 16%` | Sidebar dividers |
| `--sidebar-primary-foreground` | `222 47% 6%` | `0 0% 6%` | Text on primary elements |

---

## Gradients

| Token | Before | After |
|-------|--------|-------|
| `--gradient-card` | `linear-gradient(180deg, hsl(222 47% 10%), hsl(222 47% 8%))` | `linear-gradient(180deg, hsl(0 0% 10%), hsl(0 0% 8%))` |

---

## Unchanged Colors (Intentional Accents)

These colors remain unchanged as they provide intentional brand/semantic meaning:

### Brand Accent
- `--primary`: `168 84% 45%` (teal)
- `--ring`: `168 84% 45%` (focus rings)
- `--sidebar-primary`: `168 84% 45%`
- `--sidebar-ring`: `168 84% 45%`

### Sentiment Colors
- `--bullish`: `142 71% 45%` (green)
- `--bearish`: `0 72% 51%` (red)
- `--neutral`: `199 89% 48%` (blue)

### Chart Colors
- `--chart-1` through `--chart-10`: Various vibrant colors for data visualization

### Destructive
- `--destructive`: `0 72% 51%` (red for errors/warnings)

---

## Utility Classes

The `.glass` utility class automatically adapts to the theme using semantic tokens:

```css
.glass {
  backdrop-filter: blur(16px);
  @apply bg-background/80 border border-border/50;
}
```

---

## Design Philosophy

1. **Pure black background** (`#000000`) for maximum contrast and OLED-friendly display
2. **Neutral gray cards** (`~8% lightness`) for clear content separation
3. **Subtle borders** (`~16% lightness`) for visual hierarchy without distraction
4. **Teal accent** remains as the primary brand color for interactive elements
5. **Semantic sentiment colors** (green/red/blue) for financial data visualization

---

*Last updated: January 2026*
