# Using the reference

Open `ui-reference.html` directly in a browser; keep `tokens.css` beside it.

Try the Journal Plan screen: drag an unscheduled box onto a day, move it to another date, or drop it back into Unscheduled. Click a box to choose a planned date without dragging. Calendar/List/Board switch views of the same in-memory tasks. Ideas supports rearranging sample ideas between groups.

The reference intentionally uses October 2026 sample dates. The production app must use the actual local current date. All demo changes reset on reload; there is no persistence or backend in this reference.

`desktop-reference.png` and `mobile-reference.png` are illustrative layout mockups generated from the sample content. They are not screenshots of a running application. They provide a clear visual target for the modern black interface.

Validation completed for this package: JavaScript syntax, initial calendar markup, month/week date generation including leap day and 4/5/6-week months, List/Board markup, sample-record relationships, and local file references. The mockups were visually inspected. A browser runtime was unavailable for rendering the interactive HTML, so pointer drag behavior, touch interactions, actual responsive layout, and screen-reader behavior still require browser verification during implementation. Follow the acceptance checklist; the reference is not a substitute for it.

Some reference actions deliberately explain future-app behavior, such as Archive and Settings. The production application implements those behaviors instead of keeping reference notices.
