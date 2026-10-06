# Calendar with draggable step boxes

## The central experience
Open Journal -> Plan -> Calendar. Journal steps appear as boxes. Undated steps stay stacked in the Unscheduled tray. Drag one onto a calendar day to plan it; drag it to another day to reschedule it. The List and Board views show the same steps.

The latest user clarification takes precedence over earlier free-position canvas ideas. A calendar is phase 1's primary organization surface. There is no free-position canvas in this scope.

## Desktop structure
1. Global sidebar: Builds, Next Steps, Archive, Settings.
2. Build header: Journal, purpose, status, build actions.
3. Build tabs: Overview, Plan, Ideas, Notes.
4. Next-action strip: one task, estimated minutes, Open task.
5. Plan mode selector: Calendar, List, Board.
6. Main calendar panel: month label; Previous, Today, Next; Month/Week toggle; weekday labels; date cells.
7. Unscheduled side panel: vertically stacked task boxes, count, Add task.

Month uses a Monday-first seven-column grid. It shows complete weeks with muted adjacent-month dates. Week uses seven day columns with more vertical space for tasks. Phase 1 has date cells, not hourly appointment slots.

## Task box contents
Title; small status label; optional duration; optional milestone on hover/details. A drag handle gives a clear affordance. A planned date is implicit in its cell; it remains visible in List/Board/details. If there is a separate deadline, show a labeled deadline in details and a small overdue warning when appropriate.

Boxes stack vertically within each date cell. Keep the first three visible in compact month cells; show "+N more" to open a day drawer with the full stack and an Add task action. A drop always reaches that day even when its visible stack is collapsed. In expanded day/week view allow same-day ordering.

## Drag rules
| Action | Result |
| --- | --- |
| Unscheduled -> day | Set plannedDate to that date; append calendarOrder on that day. |
| Day -> another day | Change plannedDate; append order or insert at a visible position. |
| Day -> Unscheduled | Clear plannedDate; append order in the tray. |
| Reorder on same day | Update calendarOrder only. |
| Cancel / drop outside | No data mutation. |
| Drag a done/blocked task | It keeps its status; scheduling is independent from completion/readiness. |

Highlight the current target and announce the result, e.g. "Write emotion action cards moved to October 8." Save after a successful drop. A subtle toast may provide Undo. Avoid automatic scrolling to a different month merely because the pointer crosses an arrow; users can navigate first or choose a date through task details.

## Add and edit
Add task from the tray defaults to no planned date. Add task from a day defaults to that date. Both require a title and a milestone. If no milestone exists, offer creating one with a simple name such as First version. Do not silently attach the task to an arbitrary milestone.

Click or Enter on a task opens its detail drawer. The planned-date picker and Clear planned date provide an alternative to dragging. Changing the date is immediately reflected in Calendar/List/Board after commit. Subtasks are accessible in details and share their parent's planned date in phase 1.

## Dates
Store YYYY-MM-DD or null for plannedDate. It is a work date, not a deadline. Label optional dueDate "Deadline" separately. Generate dates with local calendar components; avoid new Date('YYYY-MM-DD') and UTC slicing for local-day logic. Calculate Today using the user's device timezone. Date storage is unaffected by travel across timezones because it is a calendar day, not a timestamp.

Previous/Next navigates by displayed month/week. Today navigates to the real current local date without modifying tasks. Clicking an adjacent-month date may open that day; navigation is optional, never a data mutation.

## Mobile and accessibility
Use Week initially on small screens while honoring a manually selected preference. Keep date columns at least 150px wide and make the calendar region horizontally scrollable; do not squeeze seven unreadable columns into 390px. Unscheduled is a collapsible tray above/below the calendar. Provide List as an immediate alternative.

Desktop uses pointer dragging; touch uses a drag handle/press delay to distinguish from scroll. A date picker and Move to date menu must make every action possible without dragging. Announce changes to assistive technology. Calendar cells have full date labels; box titles are accessible names. The reference HTML uses native desktop drag and date-picker alternatives to demonstrate the visual behavior; production should use robust touch/keyboard support.

## Relevant checks
Correct month starts/ends, October 2026, February 2028, year rollover, 4/5/6-week months, date movement without duplication, multiple tasks per day, unscheduling, same-day order, hidden tasks via +N more, filtering without corrupting order, mobile scrolling, keyboard move, and refresh persistence.
