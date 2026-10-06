# Screens and flows

## 1. Builds /builds
Top bar: page title, search, Add build. Below: filter chips All, Idea, Planned, Active, Paused, Completed. Compact cards show title, one-line purpose, status, completed/total task count, next action or a useful planning prompt. Pinned builds precede the user's saved order. Default desktop view is a board with Idea, Planned, Active, Paused, Completed columns. Cards drag between columns to update build status. Offer a Grid toggle. The board scrolls horizontally; mobile opens to Grid with a Board toggle. Pinned order is managed within each status column.

Empty state: "Make room for your next idea." Button "Add your first build"; secondary "Try sample builds". Samples must be optional and safely separated from existing data.

Add build dialog: title required; optional one-sentence idea and category. Save first; show an optional "Plan this build" action afterward. Do not force a multi-page onboarding wizard.

## 2. Build workspace /builds/:buildId/:tab
Header: back to Builds, editable title, status selector, overflow actions Pin, Duplicate, Archive. Below: tabs Overview, Plan, Ideas, Notes.

### Overview
1. Goal and definition of done, both editable with clear empty prompts.
2. Selected next action card with task title, milestone, optional estimate, Complete and Change action.
3. First version: checkable achieved features, Add feature, and links back to source ideas when present. Completing a feature is independent of task progress; the UI must label it clearly.
4. Concise planning summary: completed task count and milestone count. No charts in phase 1.
5. Optional constraints panel: time availability, budget notes, required skills/resources, target date.

If no next action: show "Choose a next step" and up to three ready task candidates in milestone/order sequence. Never silently guess a next action. If no tasks exist, offer "Add the first milestone". If all remaining tasks are blocked, offer "Review blockers".

### Plan
View selector: Calendar (default), List, Board. Remember the last selected view per build.

Calendar: Month and Week layouts of date cells with draggable task boxes. An Unscheduled tray shows tasks without plannedDate. Drag a task into a day to set plannedDate; move between days to reschedule; drag back to the tray to unschedule. Multiple boxes stack vertically within a day. Click a box for task details. Previous/Today/Next changes the displayed period. All tasks remain available in List/Board regardless of the displayed month. The Unscheduled stack contains only tasks with no plannedDate. See specs/08-CALENDAR-INTERACTION.md for detailed behavior.

Board: To do, Doing, Blocked, Done columns; drag changes task status, subject to prerequisite rules. Filter by milestone. Status changes never reschedule a task.

List view: milestone list: editable name, outcome, task counts, expand/collapse, move up/down. A milestone's state comes from its contained tasks.

Task row: completion control, title, compact status, optional estimate. More opens a details drawer with priority, planned date, optional deadline, prerequisites, blocker reason, notes, next-action selection, move milestone, delete, and "Break into smaller steps".

Breakdown panel: keep the parent title; add/edit/reorder concrete subtasks. One subtask level only. Reordering must also have accessible Move up/Move down controls.

Completing a task with unfinished subtasks must offer "Complete all steps" or Cancel. Partial completion updates task state and progress according to the data spec.

### Ideas
Always-visible quick capture field: "What else could this build become?" Save with button or keyboard shortcut shown beside it. Draggable columns: Inbox, First-version candidates, Later, Dropped. Moving changes the idea group; it does not automatically convert the idea into a committed feature or task. Mobile also offers a list with a Move menu. Each idea has title, optional description, tags, and actions Change group, Edit, Convert.

Convert dialog: choose "First-version feature" or "Task". Task conversion requires a target milestone. Show the new item's editable title and description; retain the idea and attach a link to the created item. An already converted idea shows "Open feature/task" rather than duplicate conversion.

When a concept is big, keep it as a later idea or create a separate build explicitly. Do not auto-expand scope.

### Notes
Simple text notes with heading and body; external resource links with label and URL. A small weekly review uses three prompts: "What moved forward?", "What is stuck?", "What will I do next?" Saving a review does not change the selected next action unless explicitly requested.

## 3. Next Steps /next
Show selected ready actions for active, non-archived builds. Each card includes build title, action title, milestone, optional minutes, Complete, Open build. If a selected action is blocked, show a blocker notice rather than a Start/Complete action. Paused or planned builds appear only if the user changes the status filter.

If an active build has no selected action, show up to three ready options with "Set as next". The user's explicit selection is the source of truth. No priority algorithm is required.

## 4. Archive /archive
Searchable archived build list with archived date, status, Restore, and a separate Permanent delete action. Restore retains data and status. Deletion must show the build title and counts; cancel preserves everything. Completing a build does not automatically archive it.

## 5. Settings /settings
Download backup; import backup file; last successful save; storage failure help; optional sample builds; preferred start area (Builds or Next Steps). Make it clear that phase 1 data is held by this browser on this device.

Import flow: choose file -> validate -> preview counts and collision summary -> choose Merge or Replace -> explicit confirmation -> transaction -> success. Failed validation cannot alter current data. Export current data before replacement and abort replacement if creating that backup fails.

## Main journeys
| Journey | Steps |
| --- | --- |
| New build | Add title -> save -> clarify goal -> add first-version features -> milestones -> tasks -> select next action. |
| Growing Journal idea | Open Journal -> Ideas -> capture idea -> leave in Inbox/Later -> evaluate during review -> convert only when chosen. |
| Resume work | Next Steps -> open selected task -> complete or record blocker -> choose the next ready action. |
| Task too big | Task details -> Break into smaller steps -> add actionable steps -> select first ready subtask. |
| Put work aside | Change to Paused or Archive -> return later -> restore without losing ideas. |

## Cross-screen behavior
- Escape closes a dialog/drawer and returns focus to its trigger. Cancel discards only unsaved dialog fields.
- Text edits show Saving, Saved, or Couldn't save. Preserve unsaved text after errors.
- Archive has an Undo toast; permanent delete has explicit confirmation.
- Links use only validated http/https protocols and open with safe external-link behavior.
- Long names wrap; notes use text rendering. Empty, no-results, blocked, and all-done states have specific actions.
