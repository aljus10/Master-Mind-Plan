# Future Build Organizer

A personal planning web application built to help you capture future build ideas, define an achievable first version, break the work into milestones and tasks, and choose one useful next action at a time.

## Tech Stack & Architecture

- **React 19** with **TypeScript**
- **Vite** development server and bundler
- **React Router 7** for hash/history client-side routing
- **Vitest** for domain and data integrity testing
- **Modern Black Design System** (custom CSS tokens with near-black `#09090b` canvas, charcoal `#121216` panels, `#f4f4f5` headings, restrained `#b5a1ff` violet accent, and WCAG AA contrast)
- **Local Storage Repository Boundary** with envelope versioning, debounced autosave, and atomic import/export transactions.

## Local Setup & Run Instructions

From the `app/` directory:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open your browser to the local URL displayed (typically `http://localhost:5173/`).

3. **Run unit & integrity tests:**
   ```bash
   npm test
   ```

4. **Create a production build:**
   ```bash
   npm run build
   ```

## Key Features & Structure

1. **Builds (`/builds`):**
   - Create a build with just a title (low friction capture).
   - Board and Grid layout toggles.
   - Draggable status cards across *Idea*, *Planned*, *Active*, *Paused*, and *Completed*.
   - Pin favorite builds to the top.
   - Archive and duplicate capabilities.
   - Search and status filter chips.

2. **Build Workspace (`/builds/:buildId/:tab`):**
   - **Overview:** Define the core goal, definition of done, first-version feature scope, leaf-unit progress, and optional constraints (time availability, budget, resources, target date).
   - **Plan:** 
     - **Calendar View (Default):** Month and Week layouts (Monday-first, complete weeks) with draggable step boxes, an Unscheduled tray, same-day stacking and reordering, and a "+N more" day expansion drawer.
     - **List View:** Milestone breakdown, task ordering, subtask progress, completion toggles, and milestone reordering.
     - **Board View:** Drag tasks between *To do*, *In progress*, *Blocked*, and *Done* with strict prerequisite checks and blocker prompt dialogs.
   - **Ideas:** Quick capture input, 4-column organization (*Inbox*, *First-version candidates*, *Later*, *Dropped*), and atomic conversion to either a first-version feature or an actionable task (preserving the original idea record).
   - **Notes:** Freeform documentation, safe external resource links (`http`/`https`), and a 3-question weekly reflection (*What moved forward? What is stuck? What will I do next?*).

3. **Global Next Steps (`/next`):**
   - Shows the selected next action for every active build.
   - Directly mark actions complete or open the build.
   - If a step is blocked, displays a clear blocker warning instead of a complete action.
   - If no action is selected, offers ready candidate recommendations.

4. **Archive (`/archive`):**
   - Searchable archive of inactive builds.
   - Instant restoration with all contained items intact.
   - Confirmed permanent deletion showing affected item counts.

5. **Settings & Backup Recovery (`/settings`):**
   - Download complete JSON workspace backup.
   - Validate and preview backup files before import.
   - Choose between **Merge** (safe remapping of colliding IDs) and **Replace** (with an automatic safety backup downloaded first).
   - Opt-in sample data loader ("Try sample builds") for the Journal blueprint.
   - Storage corruption recovery modal with raw data export.

## Data Rules & Safety Guarantees

- **No Data Loss on Reload:** Saves after every committed drag-and-drop, state change, and debounced text edit, accompanied by a visible save indicator.
- **Dependency Integrity:** Prevents self-dependencies and cyclic graphs.
- **Accurate Progress:** Only actionable leaf units are counted (subtasks are counted once; parent tasks with subtasks are never double-counted).
- **Date Handling:** Uses device-local calendar dates (`YYYY-MM-DD`) without UTC offset drift. Planned work dates are cleanly separated from optional deadlines.

## Known Limitations (Phase 1 Boundaries)

- **Local Storage Only:** Data is stored within your current browser profile. Cloud synchronization, user authentication, and multi-user collaboration are scheduled for later phases.
- **Single Level of Subtasks:** In accordance with the phase-1 scope, tasks support one actionable level of subtasks.
- **No Third-Party Calendar Sync:** Calendar scheduling operates strictly within the application (no iCal/Google Calendar push/pull in Phase 1).
