# Acceptance checklist

The finished app must pass these checks. This blueprint does not claim an application has already been implemented.

## Essential workflow
- [ ] A title alone creates a build; optional information can be added later.
- [ ] Journal can hold 20+ later ideas without placing them in the first-version feature list.
- [ ] Build stages, task statuses, and idea groups are visibly different concepts.
- [ ] The next action is visible near the top and comes from an explicit selection.
- [ ] Ideas can become features/tasks while preserving their source link.
- [ ] A user can complete a useful workflow without AI, login, or an API key.

## Dragging and boxes
- [ ] Drag builds between stages; reload and confirm the new stage/order.
- [ ] Drag tasks between status columns; all views reflect the same task state.
- [ ] A blocked prerequisite prevents a task entering Doing/Done; the reason is explained.
- [ ] Moving a parent to Done confirms completion of unfinished subtasks.
- [ ] Canceling a blocked-status dialog or drag returns the item to its original state.
- [ ] Move task rows between milestones without breaking IDs or next actions.
- [ ] Drag ideas between groups without automatically committing them as features.
- [ ] Drag a Journal task from Unscheduled onto a date; its plannedDate persists after reload.
- [ ] Move a scheduled box to another day; List/Board/date editor reflect the change.
- [ ] Drag back to Unscheduled; the date clears and task details remain.
- [ ] Stack and reorder multiple boxes on the same day without duplicates.
- [ ] Month/week navigation renders correct dates, including leap-year February.
- [ ] A completed/blocked task retains its date and status during calendar movement.
- [ ] All calendar drag actions are also available through a date picker/Move menu.
- [ ] Ordinary two-finger trackpad scroll stays ordinary scrolling.
- [ ] Mouse, touch, and keyboard alternatives all work.

## Consistency
- [ ] Progress counts subtasks once, never the parent plus the same subtasks.
- [ ] Empty plans show Not planned yet.
- [ ] Finished or blocked selected actions are cleared and alternatives offered.
- [ ] Paused/archived projects are absent from the default Next Steps list.
- [ ] Delete cleanup leaves no broken dependencies references.
- [ ] Duplicate resets completion and produces independent IDs.

## Saving and recovery
- [ ] After saving, refresh retains all entities and the preferred plan view.
- [ ] Successful write precedes the Saved label.
- [ ] Failed storage writes preserve open changes and offer backup/retry.
- [ ] Sample data never overwrites real work.
- [ ] Export/import round trip preserves relationships and planned dates.
- [ ] Malformed or incompatible imports change no current data.
- [ ] Merge remaps colliding IDs and preserves current records.
- [ ] Replace requires preview, current-data backup, and confirmation.
- [ ] Corrupt storage offers recovery rather than silent reset.
- [ ] Concurrent tab changes cannot silently overwrite local edits.

## UI quality
- [ ] No page-level horizontal overflow at 390px; boards/calendar have intentional internal scrolling.
- [ ] Long titles, empty states, no search results, and all-done states render well.
- [ ] Text contrast meets AA; state is never conveyed by color alone.
- [ ] Keyboard focus is visible; dialogs trap and return focus correctly.
- [ ] Reduced-motion setting is respected; touch targets are comfortable.
- [ ] No placeholder controls or broken routes remain.
