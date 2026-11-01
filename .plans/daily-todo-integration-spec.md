# Daily To-Do List Integration Specification

**Document:** `daily-todo-integration-spec.md`  
**Project:** Master Mind Plan (`Future-Build-Organizer`)  
**Target Platforms:** Windows Desktop (`.exe`), Android Mobile (`.apk`), Web/PWA  
**Date:** November 1, 2026  
**Status:** Approved Specification  

---

## 1. Executive Summary & Problem Statement

### 1.1 The Problem
**Master Mind Plan** was initially architected as a top-down project and product roadmap organizer:
$$\text{Workspace} \longrightarrow \text{Builds} \longrightarrow \text{Milestones} \longrightarrow \text{Tasks} \longrightarrow \text{Subtasks}$$
While powerful for multi-week initiatives (*e.g., "A-D trade strat"*, *"Future builds app"*), it creates excessive friction for rapid, day-to-day execution. Users frequently need to jot down quick errands, study topics (*e.g., "Study binary addition and subtraction"*), or scheduled follow-ups (*e.g., "Follow up on Loggy3 payout on Nov 6"* with draft email snippets) without inventing a full project "Build" and "Milestone" container.

### 1.2 The Solution
Introduce a dedicated, first-class **Daily To-Do List** directly into Master Mind Plan that:
1. Serves as the primary landing page (**"Today"** tab).
2. Allows instant, frictionless quick-entry optimized for rapid voice-typing ("yap/blabber" input) and multi-line pastes.
3. Automatically rolls forward unfinished tasks from previous days when the app opens on a new day.
4. Allows expandable notes for email drafts, code blocks, or study checklists.
5. Optionally links a daily task to any active Build with one tap.
6. Seamlessly syncs in real-time across Windows PC and Android Phone using the existing zero-config Supabase infrastructure (`MIND-5UEF`).

---

## 2. User Experience & Interaction Design

### 2.1 Navigation & Placement
- **Primary Landing Screen**: The app's main navigation will place **Today** as the very first item:
  - **Mobile Bottom Bar**: `[ Today ]` | `[ Builds ]` | `[ Next Actions ]` | `[ Settings ]` | `[ Archive ]`
  - **Desktop Top Bar**: `[ Today ]` | `[ Builds ]` | `[ Next Actions ]` | `[ Settings ]` | `[ Archive ]`
- Opening the app automatically lands on today's active tasks.

### 2.2 Minimal Header with Date Switcher
- Clean, uncluttered header:
  ```text
  [ < ]  Today · Monday, Nov 2, 2026  [ > ]     [ Today Jump Button ]
  ```
- **Date Navigation**:
  - `[ < ]`: Navigate to yesterday / previous day history.
  - `[ > ]`: Navigate to tomorrow or future scheduled dates.
  - Clicking `[ Today ]` instantly resets view to the current day.
- **Progress Bar**:
  - A sleek, subtle horizontal completion meter under the date:
  - *"3 of 5 completed (60%)"* with smooth green accent filling.

### 2.3 Smart Quick-Input & Voice "Yap" Parser
Users frequently use voice-to-text dictation on mobile or rapid multi-line copy-pasting. The input bar accommodates this:
- **Single Line Mode**: Type a task and hit `Enter` or tap `+ Add`.
- **Yap / Multi-line Parser**: If the text contains multiple lines (or dictation delimiters like bullet points `- `, numbered lists `1. `, or line breaks):
  - Automatically splits into distinct daily to-do items.
  - Empty lines are trimmed.
- **Optional Build Tag**: A dropdown/pill selector next to the input:
  - `[ Standalone (No Build) ▾ ]` or pick e.g. `[ Future builds app ]`.

### 2.4 Task Item Anatomy & Interactions
Each to-do item in the list features:
```text
┌────────────────────────────────────────────────────────────────────────┐
│ [✓] Study computer architecture: binary addition        [Build Tag] [⋯] │
│     Completed at 10:45 AM                                              │
│     ▼ Notes: Read chapters 2 & 3 before quiz                          │
└────────────────────────────────────────────────────────────────────────┘
```
1. **Checkbox**:
   - Unchecked: Open circle.
   - Checked: Instant smooth strike-through, dimmed title color, completion timestamp recorded.
2. **Expandable Note / Draft Snippet**:
   - Tap note icon or click to expand note drawer.
   - Supports multiline text, pre-formatted draft emails (like the Loggy3 template), and links.
3. **Optional Build Badge**:
   - If tagged to a project build, displays a subtle badge (e.g., `Future builds app`). Clicking navigates directly to that build workspace.
4. **Actions Menu (`...`)**:
   - `Move to Tomorrow`
   - `Pick Date...`
   - `Link to Build...`
   - `Delete`

### 2.5 Upcoming Scheduled Tasks Accordion
Below today's list, a collapsible section:
- **`▼ Upcoming (2 tasks scheduled)`**
  - Grouped by date:
    - **Tomorrow (Nov 3)**: *1 task*
    - **Friday (Nov 6)**: *Follow up on Loggy3 payout (email draft ready)*
- Allows planning future days ahead while keeping Today's focus clear.

---

## 3. Data Schema & Architecture

### 3.1 Domain Model Definition
Add `DailyTodo` to [app/src/domain/types.ts](file:///c:/Users/Justin/Downloads/Projects/October%20projects/Future-Build-Organizer/app/src/domain/types.ts):

```typescript
export interface DailyTodo {
  id: Id;                        // 'todo-xxxx-xxxx'
  title: string;                 // Task title
  date: CalendarDate;            // 'YYYY-MM-DD'
  completed: boolean;            // Completion status
  completedAt: string | null;    // ISO timestamp when finished
  notes: string;                 // Multiline body, drafts, snippets
  buildId: Id | null;            // Optional link to project Build
  order: number;                 // Ordering within the day
  rolledFromDate?: CalendarDate; // Tracks if task was carried forward
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

### 3.2 Workspace Schema Update
Extend `Workspace` domain type:

```typescript
export interface Workspace {
  builds: Build[];
  milestones: Milestone[];
  tasks: Task[];
  ideas: Idea[];
  features: Feature[];
  notes: Note[];
  reviews: Review[];
  dailyTodos: DailyTodo[];       // New first-class collection
  preferences: UserPreferences;
}
```

### 3.3 Default & Migration Handling
In `repository.ts` and `sampleData.ts`:
- If loading an older workspace where `dailyTodos` is `undefined`, initialize `dailyTodos: []`.
- Fully backwards-compatible; no data loss or migration errors for existing builds and tasks.

---

## 4. Automatic Rollover & Lifecycle Engine

### 4.1 Rollover Logic (`app/src/domain/rollover.ts`)
When the app opens or resumes from background:
1. Compare the current calendar date $D_{\text{today}}$ (e.g. `2026-11-02`) against existing uncompleted todos.
2. Filter todos where:
   $$\text{todo.completed} = \text{false} \quad \text{AND} \quad \text{todo.date} < D_{\text{today}}$$
3. For each overdue uncompleted task:
   - Update `date = D_{\text{today}}`.
   - Set `rolledFromDate = todo.date` (preserves historical origin).
   - Set `updatedAt = nowISO()`.
4. Leave all `completed: true` tasks untouched under their original completion dates to preserve historical records.
5. If any tasks were rolled forward, trigger a non-blocking background save and Supabase cloud sync (`MIND-5UEF`).
6. Display a subtle non-intrusive toast: *"Rolled 2 unfinished tasks forward to Today"*.

---

## 5. Storage, Sync & Deduplication

### 5.1 Real-Time Cross-Device Sync (Windows + Android)
- `dailyTodos` will reside inside `workspace_data` in the Supabase `workspaces` table under key `MIND-5UEF`.
- Creating, editing, checking off, or reordering a daily to-do on either Windows or Android automatically pushes changes in $< 1\text{s}$ via WebSocket and updates the other device.

### 5.2 Smart Deduplication ([merge.ts](file:///c:/Users/Justin/Downloads/Projects/October%20projects/Future-Build-Organizer/app/src/storage/merge.ts))
Extend `deduplicateWorkspace`:
- Match `dailyTodos` by `id` or normalized `(date + title)`.
- If an item was marked completed on device A while still open on device B, prefer `completed: true` and the latest `updatedAt`.
- Merge notes cleanly without duplicate creation.

---

## 6. Implementation Milestones

| Step | Scope | Details |
| :--- | :--- | :--- |
| **Step 1** | **Domain Types & Schema** | Add `DailyTodo` interface in `types.ts`, update `Workspace`, update sample/empty workspace builders, update repository validators. |
| **Step 2** | **Rollover & Domain Logic** | Implement `rolloverUnfinishedTodos` in `domain/rollover.ts` with unit tests for edge cases (leap days, month rollovers). |
| **Step 3** | **WorkspaceContext Actions** | Add `addDailyTodo`, `updateDailyTodo`, `toggleDailyTodo`, `deleteDailyTodo`, `reorderDailyTodos`, `rollForwardTodos` to `WorkspaceContext.tsx`. |
| **Step 4** | **Merge & Deduplication** | Update `mergeWorkspaces` and `deduplicateWorkspace` in `merge.ts` to support `dailyTodos`. |
| **Step 5** | **UI Components** | Build `DailyTodoPage.tsx`, `DailyTodoItem.tsx`, `QuickAddTodoBar.tsx`, and `DateSwitcher.tsx`. |
| **Step 6** | **Navigation & Router** | Set `Today` as the default route (`/` or `/today`), update `Layout.tsx` top-bar and mobile bottom navigation. |
| **Step 7** | **Verification & Packaging** | Run Vitest test suite, compile desktop Windows `.exe` (`MasterMindPlan-Portable.exe`), compile Android `.apk` (`MasterMindPlan.apk`), and verify live on device. |

---

## 7. Approval & Sign-Off
This specification has been aligned with the user's interview responses and is ready for execution.
