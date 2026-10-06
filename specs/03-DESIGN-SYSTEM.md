# Modern black UI

## Direction
Calm, focused, and polished. A black workspace with readable charcoal surfaces and strong typography. The hierarchy should feel obvious: project -> next action -> plan -> supporting details.

The reference HTML is a visual guide, not a functioning application. Inspect it together with the illustrative desktop/mobile PNG mockups. The PNGs are layout illustrations, not browser screenshots.

## Tokens
| Token | Value | Use |
| --- | --- | --- |
| Background | #09090B | App canvas |
| Sidebar | #0C0C0F | Global navigation |
| Surface | #121216 | Standard panels |
| Raised surface | #19191F | Selected/hover rows, dialogs |
| Border | #292930 | Panel separation |
| Primary text | #F4F4F5 | Headings and important labels |
| Secondary text | #B0B0BB | Descriptions |
| Muted text | #92929F | Metadata; verify contrast at rendered sizes |
| Primary button | #F4F4F5 on #09090B | Main action |
| Accent | #B5A1FF | Selection, focus, subtle emphasis |
| Success | #7EDDB5 | Completed status |
| Warning | #F0C677 | Blockers and later status |
| Error | #FF9AA7 | Failed save and validation |

Use color plus a text label or icon; never color alone. Add a visible 2px focus ring with sufficient contrast.

## Typography
Use Inter if locally available, otherwise system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif. The reference uses the system stack so it works offline.
- Main heading: 30-36px / 1.15, weight 600; mobile 26px.
- Section heading: 18-20px / 1.3, weight 600.
- Body: 14-16px / 1.55.
- Metadata: 12-13px / 1.4; avoid tiny low-contrast text.
- One main font. Uppercase only for short section labels.

## Layout
Desktop sidebar 224px; content padding 36px; main content max width 1200px. Two-column build overview with a larger primary column and narrower first-version/ideas column. Boards use equal 280-320px columns with horizontal scrolling inside their own region. Next action sits near the top. No more than three compact summary values.

Tablet: narrower sidebar or collapsible drawer; content becomes one column below 1000px. Mobile: sticky compact header, menu drawer, horizontally scrollable build tabs, one-column cards. Do not render a miniature desktop sidebar. A floating capture button is optional; do not cover content.

## Components
- Buttons: 10px radius, 40-44px minimum touch height, clear primary/secondary/text variants.
- Panels: 14-16px radius, 1px border, generous padding; limited shadow.
- Inputs: 44px touch height, visible labels, black/charcoal fill, error text adjacent.
- Status chips: subtle tinted backgrounds, readable label, optional small dot.
- Task rows: large completion target, title wraps, metadata below on mobile.
- Drag cards: subtle six-dot handle, raised border while moving, clear insertion marker and highlighted destination.
- Calendar: clean seven-column date grid, subtly highlighted Today, stacked draggable task boxes, compact status dot plus label, and an Unscheduled side tray. Month/week toggle and previous/today/next controls stay visible.
- Mobile calendar: horizontally scrollable seven-day grid inside its own region with comfortable minimum column widths; open Week by default on narrow screens. The Unscheduled stack collapses below the header. Provide List as an accessible alternative.
- Dialogs: desktop centered; mobile bottom sheet/full-height when editing a large task.
- Empty states: concise explanation plus one useful action.

## Interaction
150-200ms color/opacity transitions. Respect prefers-reduced-motion. No forced animated introductions. Display a clear loading state only for operations that genuinely take time.

## Accessibility
Semantic landmarks, heading order, labeled controls, dialog focus trap, keyboard tab order, 44px touch targets, AA text contrast, announced validation/save errors. Dragging always has a keyboard alternative. Verify the actual interface, not just the palette.

## Avoid
Neon outlines, rainbow tags, heavy glass effects, noisy backgrounds, decorative charts, oversized stat cards, all-uppercase paragraphs, app controls that look like marketing buttons, or a separate onboarding screen for every planning field.
