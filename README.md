# Strata (v1.1.0)
> **Blueprints on the bedrock. Tactical focus on the surface.**

Strata is a unified, high-performance desktop, mobile, and web workspace that seamlessly bridges long-range architectural project planning with tactical day-to-day execution.

---

## ✨ Features & Architecture

### 1. Tactical Execution (Surface Layer)
* **Daily Focus & Automatic Rollover:** Capture day-to-day priorities. Any uncompleted tasks roll forward past midnight automatically without corrupting historical logs.
* **Focus Mode ("The One Thing"):** Distraction-free full-screen execution card with an ambient dual-mode timer (25m Pomodoro countdown or open Stopwatch) and an auto-saving scratchpad.
* **Recurring Daily Routines:** Track habits and routines (e.g. *Morning Review*, *Sync PRs*, *Evening Log*) that reset every morning with zero database bloat and track streaks (`🔥 Nd streak`).
* **7-Day Velocity Momentum:** A sparkline showing completed tasks and routines across the past 7 days.
* **Rapid Voice & Braindump "Yap" Parser:** Paste raw multi-line notes, speech-to-text dictation, or markdown checklists (`- [ ]`, `1.`) and convert them into clean tasks instantly.

### 2. Architectural Blueprints (Bedrock Layer)
* **Build Workspace:** Manage projects across *Idea*, *Planned*, *Active*, *Paused*, and *Completed* stages in both Board and Grid layouts.
* **Step Breakdown & Prerequisite Graph:** Cycle-validated task dependencies preventing premature execution before blockers are resolved.
* **Bi-Directional Milestone Dispatch:** 1-click `[ 📥 Today ]` dispatch from any milestone or Next Action directly into Today's focus. Ticking items in either domain automatically keeps the other in sync.
* **Blueprint Scoped Filtering:** Filter today's action checklist by blueprint chip with 1-click navigation directly to the blueprint plan.

### 3. Data Durability & Portability
* **Institutional-Grade Concurrency & Sync:** Multi-device synchronization via Supabase WebSockets with deletion tombstones permanently preventing zombie task resurrection.
* **Point-in-Time Restore Points (Snapshots):** Rolling local snapshots in `strata:snapshots:v1` enabling 1-click local rollback with automated safety preservation.
* **Markdown Standup & Blueprint Export:** 1-click export formatting completed items, pending actions, and *The One Thing* into clean Markdown for Slack/Discord/GitHub.
* **High-Contrast Print & PDF Stylesheet:** Dedicated `@media print` formatting for crisp paper printing.

---

## 💻 Multi-Platform Distribution

Precompiled binaries are located directly in the repository:

* **Windows Desktop (Portable):** [`dist-windows/Strata-Portable.exe`](dist-windows/Strata-Portable.exe)
* **Windows Desktop (Installer):** [`dist-windows/Strata-Setup.exe`](dist-windows/Strata-Setup.exe)
* **Android Package:** [`dist-apk/Strata.apk`](dist-apk/Strata.apk)

---

## 🚀 Development & Build

```bash
# Install dependencies
npm --prefix app install

# Start local dev server (http://localhost:5173)
npm run dev

# Run unit & domain stress test suite
npm test

# Build production web bundle (sub-110KB entry chunk)
npm run build

# Package native Windows executables (Electron)
npm run electron:build

# Package Android APK (Capacitor + Gradle)
npm run android:build
```

---

## 🏛️ System Architecture

* **Framework:** React 19 + TypeScript + Vite 8 (Rolldown code-splitting)
* **Desktop Shell:** Electron 44 (Native filesystem persistence + local storage fallback)
* **Mobile Shell:** Capacitor 8 (Android SDK 35 + hardware micro-haptics)
* **Cloud Sync:** Supabase Realtime WebSockets with bi-directional conflict resolution
* **Styling:** Custom Strata Dark token system adhering to Impeccable UI standards
