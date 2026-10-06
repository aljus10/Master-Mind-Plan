# Data and behavior contract

`contracts/types.ts` is the proposed single data shape. Use stable UUID strings for records; UTC ISO timestamps for creation/update; local calendar dates (YYYY-MM-DD) for optional due dates.

## Relationships
- Workspace contains builds, milestones, tasks, ideas, features, notes, reviews.
- Each milestone belongs to one build. Each task belongs to one milestone in the same build.
- Each task has at most one level of subtasks. Subtasks are task-owned records with stable IDs.
- Features belong to a build. Ideas may link to one converted feature or root task in the same build.
- Each build may explicitly select one next action: a task, or a subtask within that task.

## Ordering and dragging
Builds have a numeric order within their current status; pinned builds appear first within that column. Milestones have an order within a build. Tasks have an order within milestone plus boardOrder within status. Ideas have an order within group. Subtasks have an order within their task. Tasks also have calendarOrder within each planned date or the unscheduled tray.

Move operations use stable IDs and a destination ID/index. Normalize numeric order after a move. A filtered list must reorder the moved item relative to actual neighboring IDs, leaving hidden items otherwise intact. Cancellation must roll back optimistic visual changes without committing a save.

| Drag operation | Mutation |
| --- | --- |
| Build card to another stage | Change build status and order. Archiving stays separate. |
| Task card to status column | Change task status and boardOrder, subject to prerequisite/subtask rules. |
| Task row to milestone | Change milestoneId and order; retain ID, dependencies, and source links. |
| Idea card to group | Change idea group and order. No automatic feature/task creation. |
| Milestone row up/down | Change milestone order. |
| Subtask row up/down | Change subtask order. |
| Task box onto calendar day | Change plannedDate and calendarOrder only. |
| Task box into Unscheduled | Set plannedDate=null and update calendarOrder only. |

## Task readiness and status
Root tasks depend only on other root tasks in the same build. Reject self-dependencies and cycles before commit. Done prerequisite means its effective status is done.

Ready action: build is not archived/completed, task is not done/manually blocked, and every prerequisite is done. A subtask additionally must be unfinished. A parent with subtasks is actionable through an unfinished subtask; choose the first unfinished subtask in saved order unless the user explicitly selects another.

Dependencies are respected for Done and Doing transitions. If prerequisite work is unfinished, reject the move and explain which task blocks it. To mark a task Blocked, ask for a short reason before committing. Cancel returns the card to its original column.

Task completion:
- No subtasks: task.status is the completion source.
- With subtasks: if all are done, parent becomes done; if some are done and parent is not manually blocked, parent is doing; if none are done and parent was done, it becomes todo.
- Moving parent to Done with unfinished subtasks offers Complete all steps or Cancel; it cannot silently discard unfinished work.
- Moving a fully done parent with subtasks to Todo/Doing requires confirmation to reopen all steps; Cancel restores its original state.
- Reopening a prerequisite must move unfinished Doing dependents to Blocked and warn about completed dependents. Offer explicit reopening of completed dependents; do not silently revoke completed work. Their data remains done but a dependency warning is shown.
- Dependency blocking is derived separately from manual blocker text. Show both reasons when applicable. Ready state uses derived dependency state.

## Progress
Count actionable leaf units: a root task without subtasks counts as one; a task with subtasks counts its subtasks and never also counts its parent. Progress = done leaf units / total leaf units. Show N/M steps alongside the percentage. No tasks means "Not planned yet", not 0% failure. Ideas and feature outcomes do not contribute to task progress.

Milestones with tasks show completed/total root task counts, explicitly labeled "tasks". A milestone is completed when all its root tasks are done. An empty milestone is unplanned. Build completion is explicit: if unfinished tasks remain, require an acknowledgment before setting Completed. Selecting Completed clears its next action and never automatically archives it.

## Selected next action
Completion, deletion, manual blocking, or dependency changes revalidate the selected action. Clear an invalid pointer and offer ready alternatives. Do not auto-select a replacement. Pausing retains the selection but removes it from the default global Next Steps view. Moving tasks between milestones retains the pointer because task IDs do not change.

## Idea conversion
In one transaction: validate target -> create feature or task -> link idea.convertedTo -> update source timestamps -> save. The source idea text is retained. The converted item starts with a copy of the idea title/body; subsequent edits are independent and links communicate that relationship. Remove the conversion action for linked ideas; deleting a target clears the link with an explanatory notice.

## Calendar
Calendar is the primary Plan view. Each root task appears exactly once for its plannedDate or once in the Unscheduled tray. The task is the same entity across all views. See specs/08-CALENDAR-INTERACTION.md for detailed layout and interaction.

Use plannedDate for the intended work day and optional dueDate for the deadline. Never conflate them or convert calendar-only dates through UTC parsing. Moving boxes changes plannedDate/calendarOrder; task status, milestone, prerequisites, and selected next action stay unchanged. Dates and dependencies express different things: scheduling a blocked task is allowed, and its box remains clearly marked blocked.

Subtasks share the parent task's planned date in phase 1. No time slots, automatic date shifting, calendar service integration, or recurring tasks yet. Multiple tasks can share a day. Use actual local dates from the device rather than hardcoded sample dates in the real app.

## Persistence
Repository API: loadWorkspace, commitMutation, exportBackup, validateImport, applyImport. Keep storage calls behind it so a later backend can replace the adapter.

Storage envelope: schemaVersion=1, revision, updatedAt, workspace. Save under one namespaced key such as future-build-organizer:v1. Perform the full serialized write before showing Saved. Debounce text input around 500ms and flush on blur/pagehide. Save committed drag/drop and explicit actions immediately. Warn before unloading if text is still unsaved.

Quota/write error: keep in-memory changes, show "Couldn't save. Your changes are still open", offer Retry and Download backup. Never reset to samples or silently erase data. An unreadable saved document must be retained for recovery; open a recovery state with raw-data download and explicit reset choice.

Multi-tab: listen for storage changes and compare revisions. If another tab changes data, stop overwriting automatically and ask Reload latest or Download my unsaved copy. Phase 1 does not promise conflict-free simultaneous tab editing.

## Backup/import
Validate schemaVersion, required arrays, enum values, unique IDs, data types, length limits, valid dates, prerequisite acyclicity, and all foreign keys before writing. Limit imported file size to 10 MiB; show actionable errors. Parse text safely; never execute markup from notes.

Replace: prepare a downloadable current-data backup first, then replace only after explicit confirmation. Merge: preserve existing records, and remap every incoming ID that collides across the entire import, updating prerequisites, conversions, selections. Never merge unrelated entities because titles match. Increment revision; preserve original record timestamps; update envelope timestamp.

## Delete, duplicate, and archive
Archive retains all linked data. Permanent build deletion removes its children in one transaction after confirmation. Milestone deletion with tasks offers Move tasks to another milestone or Delete contained tasks; both show counts. Task deletion removes its dependencies from other tasks, its next-action pointer, and any conversion target pointer. Entity deletion is reflected immediately in calendar, board, and list views.

Duplicate build creates new IDs for all its records and remaps internal references; clears archivedAt, sets status=idea, clears nextAction, and appends "(copy)" to its name. Notes/ideas/planned dates are retained; completed task and subtask states reset to todo/false. Source build remains untouched.

## Content limits
Title 160 characters; description/note/review body 20,000; blocker 1,000; tags at most 10 per record and 40 characters each. Store resource URLs only if http or https. Trim required titles while preserving ordinary body whitespace.
