import { CalendarDate, DailyTodo } from './types';
import { nowISO } from './uuid';

export interface RolloverResult {
  todos: DailyTodo[];
  rolledCount: number;
}

/**
 * Checks if any uncompleted daily to-dos exist prior to the given calendar date.
 */
export function isRolloverNeeded(todos: DailyTodo[], today: CalendarDate): boolean {
  if (!todos || todos.length === 0) return false;
  return todos.some(t => !t.completed && t.date < today);
}

/**
 * Rolls forward uncompleted daily to-dos from previous days into the specified date.
 * - Completed tasks (- [x]) strictly remain under their original date headers to preserve history.
 * - Uncompleted tasks (- [ ]) are moved to `today`, preserving their original `rolledFromDate`.
 * - Idempotent: Calling multiple times on the same day produces no duplicate tasks.
 */
export function rolloverUnfinishedTodos(todos: DailyTodo[], today: CalendarDate): RolloverResult {
  if (!todos || todos.length === 0) {
    return { todos: [], rolledCount: 0 };
  }

  let rolledCount = 0;
  const now = nowISO();

  // Find max order currently on `today` to append rolled items cleanly
  const currentTodayOrders = todos
    .filter(t => t.date === today)
    .map(t => t.order || 0);
  let nextOrder = currentTodayOrders.length > 0 ? Math.max(...currentTodayOrders) + 1 : 0;

  const result: DailyTodo[] = todos.map(todo => {
    // If the task is already completed, or is already scheduled for today or later, keep it as is
    if (todo.completed || todo.date >= today) {
      return todo;
    }

    // Uncompleted task from a past day -> roll forward
    rolledCount++;
    return {
      ...todo,
      date: today,
      rolledFromDate: todo.rolledFromDate || todo.date,
      order: nextOrder++,
      updatedAt: now
    };
  });

  return {
    todos: result,
    rolledCount
  };
}
