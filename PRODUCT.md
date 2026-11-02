# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

Vite + React 19 + TypeScript + Electron (Windows Desktop) + Capacitor 8 (Android Mobile) + Supabase Realtime

## Users

Solo developers, makers, technical founders, and builders who manage ambitious multi-week software/hardware projects while needing a frictionless, distraction-free daily to-do list that runs smoothly across both their PC and smartphone.

## Product Purpose

Strata bridges the painful divide between long-term project planning and daily execution. It eliminates the friction of having big project blueprints in one app (Linear/Notion) and daily scratchpad tasks in another (Notes/Todoist) by uniting them into a single local-first, multi-platform tool with instant cross-device sync.

## Positioning

Strata is the dual-speed engine for personal shipping: *Architectural blueprints on the bedrock, tactical velocity on the surface.* It combines the macro rigor of milestones and definitions of done with the micro speed of zero-click voice yap dumps and automatic midnight rollovers.

## Operating Context

- **Desktop (Windows)**: Deep work sessions, code planning, milestone breakdown, board/calendar scheduling, rapid keyboard capture (`Ctrl+K`).
- **Mobile (Android)**: Walking around, commuting, quick voice dictation dumps ("yap parsing"), tactile morning review, offline execution with zero-latency synchronization.

## Capabilities and Constraints

- **Local-First & Resilient**: Works 100% offline with zero latency; automatically syncs bi-directionally via Supabase Realtime when connected.
- **De-duplication & Tombstones**: Uses immutable IDs (`tod-xxxx`) and deletion tombstones (`deletedIds`) to prevent zombie task resurrections.
- **Zero-Cost Sync**: Event-driven WebSockets and app resume hooks eliminate aggressive polling, preserving mobile battery life and staying strictly within free-tier cloud limits.
- **Auto-Rollover**: Unfinished tasks roll forward past midnight with a `↺ Rolled from [Date]` badge while preserving history intact.
- **Voice Yap Parser**: Normalizes messy voice dictation, bullet points, and inline dates (`Tomorrow:`, `Nov 5:`) into clean tasks with expandable Markdown notes drawers.

## Brand Commitments

- **Name**: Strata
- **Tagline**: Architectural blueprints on the bedrock. Tactical focus on the surface.
- **Tone**: Focused, developer-grade, tactile, dark-mode native, unpretentious, fast.
- **Visual Signature**: Deep obsidian surfaces, layered glassmorphic strata plates, neon purple/mint accents, tabular numerics.

## Product Principles

1. **Velocity Over Bureaucracy**: Capturing a thought or checking off a task must take $< 1\text{ second}$.
2. **Never Clobber, Never Resurrect**: Offline edits must merge gracefully without overwriting either device; deleted tasks stay deleted.
3. **Execution Over Delusion**: Big blueprints only matter if they produce today's single high-leverage action.
4. **Touch & Keyboard Ergonomics**: Minimum $44\text{px}$ touch targets on mobile, keyboard accelerators on desktop.
