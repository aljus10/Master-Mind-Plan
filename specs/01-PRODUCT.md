# Product structure

## Purpose
An organizer for work I may build in the future: apps, websites, study systems, creative projects, or other plans. It must hold raw ideas and help me gradually turn them into achievable work.

The user should never have to finish planning a project before saving it. Creating a build requires only a title.

## Primary jobs
| Job | Result |
| --- | --- |
| Capture a possible build | The idea is safely stored before I forget it. |
| Clarify a build | I know why it matters and what finished means. |
| Set the first version | I can keep extra ideas without growing the current scope. |
| Break down work | Every milestone has understandable tasks. |
| Continue working | I can find one ready next action immediately. |
| Review progress | I know what changed, what is blocked, and what to do next. |

## Global navigation
| Area | Purpose |
| --- | --- |
| Builds | All non-archived build cards, search, status filters, add build; Board and Grid views. |
| Next Steps | Available selected actions from active builds; ready alternatives when none is selected. |
| Archive | Restore projects put aside or completed; permanent delete through a separate confirmed action. |
| Settings | Backups, storage information, sample-data option, basic preferences. |

## Build workspace
| Tab | Contents |
| --- | --- |
| Overview | Goal, finished outcome, selected next action, first-version features, concise progress, optional constraints. |
| Plan | Ordered milestones, tasks, subtasks, prerequisites, blockers; Calendar, List, and Board views. |
| Ideas | Quick capture, unsorted ideas, first-version candidates, later ideas, dropped ideas. |
| Notes | Freeform notes, resource links, decisions, weekly review. |

## Statuses
- Build: idea, planned, active, paused, completed. Archiving is a separate property.
- Task: todo, doing, blocked, done. An explicit blocked task needs a human-readable reason.
- Idea: inbox, candidate, later, dropped. Converted ideas retain a feature/task link rather than being deleted.

## First release features
Required: build CRUD, archive/restore, search/filter, basic ordering, milestones/tasks/subtasks, manual breakdown, draggable build/task/idea cards, calendar scheduling with an unscheduled task stack, next action, idea capture/conversion, notes/links, autosave, backups, simple weekly review, responsive and accessible UI.

Optional fields: priority, estimated minutes, due date, constraints. These should be available without making every new item a form-filling exercise.

## Future release ideas
| Phase | Possible additions | Why later |
| --- | --- | --- |
| 2 | Reusable project templates, Markdown plan export, focus timer | Useful once the core workflow is reliable. |
| 3 | AI breakdown with review, suggested milestone plans | Needs a secure API integration and explicit acceptance of suggestions. |
| 4 | Accounts, encrypted transport, cloud sync, shared builds | Adds authentication and conflict resolution beyond personal local use. |

## Intentional boundaries
- The organizer stores plans for the Journal. It does not implement emotion tracking, habit tracking, or journal guidance itself.
- No team management, permissions, subscriptions, integrations, or elaborate Gantt view in phase 1.
- No artificial streaks, emotional judgments, or scoring of personal worth.
- No required dates: future builds may be exploratory.

## Success criteria
Capture an idea in under a minute; find a build's next action in a few seconds; keep first-version scope visible; reload without losing committed changes; export and recover all data.
