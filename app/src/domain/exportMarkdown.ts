import { Build, CalendarDate, DailyHabit, DailyTodo, Milestone, Task } from './types';
import { formatFriendlyDate } from './dates';

/**
 * Generates clean, executive Markdown for daily standups, team updates, or journaling.
 */
export function generateDailyStandupMarkdown(
  date: CalendarDate,
  todos: DailyTodo[],
  habits: DailyHabit[] = [],
  builds: Build[] = []
): string {
  const dayTodos = todos.filter(t => t.date === date);
  const completedTodos = dayTodos.filter(t => t.completed);
  const pendingTodos = dayTodos.filter(t => !t.completed);

  const completedHabits = habits.filter(h => (h.completedDates || []).includes(date));
  const pendingHabits = habits.filter(h => !(h.completedDates || []).includes(date));

  const totalItems = dayTodos.length + habits.length;
  const totalCompleted = completedTodos.length + completedHabits.length;
  const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  const buildMap = new Map(builds.map(b => [b.id, b.title]));

  const lines: string[] = [];

  lines.push(`# 📋 Strata Daily Standup — ${formatFriendlyDate(date)}`);
  lines.push(`**Date:** ${date} | **Velocity:** ${totalCompleted}/${totalItems} items completed (${percentage}%)`);
  lines.push('');

  // 1. Completed section
  lines.push(`### ✅ Completed (${completedTodos.length + completedHabits.length})`);
  if (completedTodos.length === 0 && completedHabits.length === 0) {
    lines.push('_No items completed yet today._');
  } else {
    for (const todo of completedTodos) {
      const buildTag = todo.buildId && buildMap.has(todo.buildId) ? ` *[${buildMap.get(todo.buildId)}]*` : '';
      lines.push(`- [x] ${todo.title}${buildTag}`);
      if (todo.notes && todo.notes.trim()) {
        const notePreview = todo.notes.trim().split('\n')[0];
        lines.push(`  > ${notePreview}`);
      }
    }
    for (const habit of completedHabits) {
      lines.push(`- [x] ${habit.title} *(Routine)*`);
    }
  }
  lines.push('');

  // 2. Pending / In-Progress section
  lines.push(`### ⏳ In Progress & Pending (${pendingTodos.length + pendingHabits.length})`);
  if (pendingTodos.length === 0 && pendingHabits.length === 0) {
    lines.push('_🎉 All clear! All scheduled actions completed for today._');
  } else {
    for (const todo of pendingTodos) {
      const buildTag = todo.buildId && buildMap.has(todo.buildId) ? ` *[${buildMap.get(todo.buildId)}]*` : '';
      lines.push(`- [ ] ${todo.title}${buildTag}`);
      if (todo.notes && todo.notes.trim()) {
        const notePreview = todo.notes.trim().split('\n')[0];
        lines.push(`  > ${notePreview}`);
      }
    }
    for (const habit of pendingHabits) {
      lines.push(`- [ ] ${habit.title} *(Routine)*`);
    }
  }
  lines.push('');

  // 3. Primary focus
  if (pendingTodos.length > 0) {
    lines.push('### 🎯 The One Thing (Next Immediate Priority)');
    const top = pendingTodos[0];
    const topBuild = top.buildId && buildMap.has(top.buildId) ? ` (${buildMap.get(top.buildId)})` : '';
    lines.push(`> **${top.title}**${topBuild}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated via Strata Workspace • Blueprints on Bedrock, Tactical Focus on the Surface*');

  return lines.join('\n');
}

/**
 * Generates a complete blueprint executive summary in Markdown.
 */
export function generateBuildMarkdown(
  build: Build,
  milestones: Milestone[],
  tasks: Task[]
): string {
  const buildMilestones = milestones
    .filter(m => m.buildId === build.id)
    .sort((a, b) => a.order - b.order);

  const buildTasks = tasks.filter(t => t.buildId === build.id);
  const doneTasks = buildTasks.filter(t => t.status === 'done');
  const percent = buildTasks.length > 0 ? Math.round((doneTasks.length / buildTasks.length) * 100) : 0;

  const lines: string[] = [];
  lines.push(`# 🏗️ Blueprint: ${build.title}`);
  lines.push(`**Status:** ${build.status.toUpperCase()} | **Progress:** ${doneTasks.length}/${buildTasks.length} tasks (${percent}%)`);
  if (build.description) lines.push(`**Description:** ${build.description}`);
  if (build.goal) lines.push(`**Goal:** ${build.goal}`);
  if (build.definitionOfDone) lines.push(`**Definition of Done:** ${build.definitionOfDone}`);
  lines.push('');

  for (const m of buildMilestones) {
    const mTasks = buildTasks.filter(t => t.milestoneId === m.id).sort((a, b) => a.order - b.order);
    const mDone = mTasks.filter(t => t.status === 'done').length;
    lines.push(`### Milestone: ${m.title} (${mDone}/${mTasks.length})`);
    if (m.outcome) lines.push(`*Outcome: ${m.outcome}*`);
    lines.push('');

    for (const t of mTasks) {
      const isDone = t.status === 'done';
      lines.push(`- [${isDone ? 'x' : ' '}] ${t.title} [Status: ${t.status}]`);
      for (const s of t.subtasks || []) {
        lines.push(`  - [${s.done ? 'x' : ' '}] ${s.title}`);
      }
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Exported from Strata Workspace*');
  return lines.join('\n');
}

/**
 * Copies plain text to clipboard safely across browser and desktop environments.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
