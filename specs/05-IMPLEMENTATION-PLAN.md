# Implementation plan

## Suggested architecture
React + TypeScript + Vite + React Router. Plain CSS variables are sufficient; a compatible existing component system may be reused. Use a maintained drag/drop library with pointer, touch, keyboard, and screen-reader support for boards; use the same drag engine for calendar days and the unscheduled tray. Confirm current documentation and compatible versions when coding; this package does not pin library versions.

Choose one state mechanism with a typed action/reducer or a small store. Do not add overlapping state libraries. All mutations go through domain actions so Calendar, Board, and List stay consistent.

## Proposed application folders
| Path | Responsibility |
| --- | --- |
| app/src/app/ | Router, root provider, layout, startup/recovery |
| app/src/components/ | Buttons, dialogs, inputs, tabs, drag handle, status chip |
| app/src/features/builds/ | Build board/grid, creation, workspace shell |
| app/src/features/planning/ | Milestones, tasks, list/board, details drawer |
| app/src/features/calendar/ | Month/week date layout, scheduled task boxes, unscheduled stack, drop targets |
| app/src/features/ideas/ | Idea columns, capture, conversion |
| app/src/features/notes/ | Notes, links, weekly review |
| app/src/features/next-steps/ | Selected ready actions and alternatives |
| app/src/features/backups/ | Export, validation, preview, import |
| app/src/domain/ | Types, actions, selectors, dependency/progress logic |
| app/src/storage/ | Repository interface, local adapter, migrations |
| app/src/styles/ | Tokens, global styles, responsive layout |
| app/src/test/ | Meaningful domain/persistence and end-to-end checks |

## Routes
/ redirects to preferred start area; /builds; /builds/:buildId/overview; /builds/:buildId/plan; /builds/:buildId/ideas; /builds/:buildId/notes; /next; /archive; /settings. Unknown build IDs show a helpful Not found state. Tabs should survive refresh and support browser back.

## Phase 1 implementation order
1. Create shell and tokens; responsive layout; navigation and empty states.
2. Implement validated domain types, repository, autosave, recovery, backups, and opt-in examples.
3. Build CRUD, search/filter, statuses, archive/restore, duplicate.
4. Milestones/tasks/subtasks, dependencies, blockers, progress, selected next action.
5. Board drag/drop and list reordering; build and idea stage dragging; alternate Move menus.
6. Calendar month/week layout, date-only calculations, unscheduled tray, drag-to-date scheduling, same-day ordering, mobile and keyboard alternatives.
7. Ideas capture and conversion, first-version features, notes/links/reviews.
8. Global Next Steps and cross-view synchronization; finish all empty/error states.
9. Run type checks/build, domain tests, and representative end-to-end flows; verify mobile and keyboard behavior.
10. Document run instructions and limitations; deliver the full working phase 1 before later additions.

## Meaningful verification
Unit tests: progress without parent double-counting; dependency cycle rejection; task readiness; parent/subtask status transitions; all import references remapped on collision; date-cell generation across month/year boundaries and leap years; deletion cleanup.

Integration/end-to-end: create a real build, capture ideas, convert one, create milestone/task/subtasks, drag across allowed and disallowed columns, select and complete next action, reload, export, then import into a clean session. Check storage failure behavior and invalid-import nonmutation. Test mouse, keyboard, and a touch viewport.

Do not test every CSS value. Check real workflows and the rendered interface.

## Later phases
Phase 2: templates, Markdown plan export, timer if useful. Phase 3: AI suggestions with preview and explicit Apply; secret keys stay server-side, and manual planning remains usable. Phase 4: account/sync/share only if requested, with conflict resolution and a clear data model.
