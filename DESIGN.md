---
name: Strata
description: Architectural blueprints on the bedrock. Tactical focus on the surface.
colors:
  primary: "#b5a1ff"
  primary-glow: "#3b324d"
  primary-subtle: "#242031"
  neutral-bg: "#09090b"
  neutral-sidebar: "#0c0c0f"
  surface-bedrock: "#121216"
  surface-raised: "#19191f"
  surface-active: "#1f1d2b"
  border-subtle: "#202026"
  border-strong: "#292930"
  border-accent: "#4a3e63"
  text-primary: "#f4f4f5"
  text-secondary: "#b0b0bb"
  text-muted: "#92929f"
  success: "#7eddb5"
  success-bg: "#13251d"
  success-border: "#2d443a"
  warning: "#f0c677"
  warning-bg: "#292317"
  warning-border: "#4d432d"
  error: "#ff9aa7"
  error-bg: "#2b1619"
  error-border: "#52272e"
typography:
  fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  display:
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "6px"
  md: "10px"
  panel: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
---

## Overview

Strata is an adaptive dark-mode engineering instrument designed for solo builders. Its visual language balances high-altitude architectural blueprints (the bedrock) with rapid daily task completion (the surface). Visual hierarchy is driven by tonal elevation, subtle ambient shadows, and optical alignment.

## Colors

The palette is rooted in deep obsidian (`#09090b`), building upward through stratified surface layers (`#121216` to `#19191f`) to minimize visual fatigue during long coding and planning sessions.
- **Primary Accent (`#b5a1ff`)**: Electric soft violet reserved for active focal points, primary actions, and brand marks.
- **Success (`#7eddb5`)**: Cool mint green for completed tasks and 100% daily velocity celebrations.
- **Warning (`#f0c677`)**: Warm amber for rolled tasks and blockers.
- **Error (`#ff9aa7`)**: Soft coral for destructive actions and tombstones.

## Typography

- **Headings**: Tightly tracked (`-0.02em` to `-0.03em`) with strong visual weight.
- **Body**: High legibility Inter stack with generous line-height (`1.5`).
- **Tabular Numerics**: All counts, percentages, dates, and timestamps enforce `font-variant-numeric: tabular-nums` to eliminate jitter during updates.

## Layout

- **Desktop (Windows)**: 224px sticky sidebar with persistent branding, workspace navigation, and pinned builds; flexible main work canvas (`max-width: 860px` for focus views).
- **Mobile (Android)**: Clean 4-tab bottom navigation (`[ Today ]`, `[ Builds ]`, `[ Next ]`, `[ Settings ]`) with safe area insets and spacious $48\text{px}+$ touch targets.

## Elevation & Depth

Surfaces communicate hierarchy through ambient soft blur shadows rather than harsh wireframe borders:
- **Floating Cards**: `box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.45), 0 1px 3px rgba(0, 0, 0, 0.6);`
- **Modals & Overlays**: `box-shadow: 0 16px 48px -4px rgba(0, 0, 0, 0.7); overscroll-behavior: contain;`
- **Border Fallbacks**: High-contrast `1px solid transparent` maintains crisp outlines in forced-colors mode.

## Shapes

- Radii follow concentric nesting: `outerRadius = innerRadius + padding` (cards 10px–14px, interactive controls 6px–8px).
- Checkboxes feature custom optical alignment (20px box, 6px radius) matching text cap-height with a 3.2px stroke checkmark.

## Components

- **QuickAddTodoBar**: Auto-expanding input with inline item count pills, project picker, and voice-yap detection.
- **DailyTodoItem**: Optical checkbox, inline editable title, expandable notes drawer for code/email drafts, and quick-move actions (`Tomorrow →`, `Pick Date`, `Delete`).
- **DateSwitcher**: `<` `>` controls, relative day pills ("Today", "Tomorrow", "Yesterday"), and an instant "Jump to Today" badge.
- **Strata Brand Mark**: Three horizontal geometric strata plates (`≡`), with the top plate glowing in accent violet.

## Do's and Don'ts

### Do
- Ensure all interactive elements meet the minimum $44 \times 44\text{px}$ touch target on mobile.
- Use `:active { transform: scale(0.96); transition: transform 150ms ease-out; }` for tactile press feedback.
- Use `tabular-nums` for all dynamic numerical counters and timers.
- Provide interactive starter pills in empty states to reduce blank-canvas paralysis.

### Don't
- Never use gradient text for headings (weight and scale drive emphasis).
- Never use emojis as a replacement for SVG icons.
- Never add unnecessary modals for tasks that can be performed inline.
- Never exceed `-0.04em` letter-spacing.
