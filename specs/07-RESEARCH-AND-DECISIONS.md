# Research and design decisions

Research consulted 5 October 2026 for the preceding discussion. These tools provide inspiration, not a claim that one is universally best.

| Source | Observed capability | What we adopt |
| --- | --- | --- |
| Goblin Tools Magic ToDo — https://goblin.tools/ToDo | Breaks tasks into smaller steps. | Make task breakdown a visible action; manual breakdown first. |
| Notion guide — https://www.notion.com/help/guides/tasks-manageable-steps-sub-tasks-dependencies | Subtasks and dependencies help organize and unblock work. | Basic hierarchy and prerequisite checks, without a complex database interface. |
| Trello documentation — https://support.atlassian.com/trello/docs/using-trello/ | Cards, lists, checklists, dates, and moving items. | Draggable cards and simple progress stages. |

## User-requested evolution
The user plans a Future Build Organizer and a Journal covering emotions, habits, and day guidance. The Journal has many additional ideas, so this organizer must work before that project is fully specified.

The user explicitly requested an interactive drag-box experience. Therefore dragging is central, not merely a cosmetic enhancement. The user clarified that project steps should remain stacked boxes while also appearing in a calendar layout with dates. Calendar is now the primary Plan view; the adjacent Unscheduled stack is a key feature. List and Board use the same tasks.

## Decisions and tradeoffs
- Capture requires only a title: low friction lets vague future ideas survive.
- First-version features are separate from ideas: ambition is retained without making every idea an immediate commitment.
- Calendar, List, and Board coexist under Plan: dates, structured breakdown, and workflow are available without multiplying global navigation.
- One selected next action: removes the need to reread a whole plan each session.
- Local saving and backups: appropriate for a first personal build; it does not promise sync or resilience to clearing browser data.
- Manual breakdown first: the core app works without accounts or external services. AI can assist later.
- Minimal black UI: supports concentration while preserving readable contrast.

## Open decisions resolved with defaults
These can be changed during coding without reopening the entire plan: neutral working name, local storage, system font fallback, four build tabs, desktop calendar with mobile Week/List alternatives. No public deployment is part of this package.
