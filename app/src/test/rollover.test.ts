import { describe, expect, it } from 'vitest';
import { DailyTodo } from '../domain/types';
import { isRolloverNeeded, rolloverUnfinishedTodos } from '../domain/rollover';

describe('Daily To-Do Rollover Engine', () => {
  it('detects when rollover is needed for past uncompleted tasks', () => {
    const todos: DailyTodo[] = [
      {
        id: 't1',
        title: 'Review priorities',
        date: '2026-10-31',
        completed: false,
        completedAt: null,
        notes: '',
        buildId: null,
        order: 0,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 't2',
        title: 'Future task',
        date: '2026-11-06',
        completed: false,
        completedAt: null,
        notes: '',
        buildId: null,
        order: 0,
        createdAt: '',
        updatedAt: ''
      }
    ];

    expect(isRolloverNeeded(todos, '2026-11-01')).toBe(true);
    expect(isRolloverNeeded(todos, '2026-10-30')).toBe(false);
  });

  it('rolls forward past uncompleted tasks to today while preserving completed tasks in history', () => {
    const todos: DailyTodo[] = [
      {
        id: 't1',
        title: 'Done yesterday',
        date: '2026-10-31',
        completed: true,
        completedAt: '2026-10-31T20:00:00Z',
        notes: '',
        buildId: null,
        order: 0,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 't2',
        title: 'Unfinished study topic',
        date: '2026-10-31',
        completed: false,
        completedAt: null,
        notes: 'Binary addition notes',
        buildId: null,
        order: 1,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 't3',
        title: 'Already on today',
        date: '2026-11-01',
        completed: false,
        completedAt: null,
        notes: '',
        buildId: null,
        order: 0,
        createdAt: '',
        updatedAt: ''
      }
    ];

    const { todos: rolled, rolledCount } = rolloverUnfinishedTodos(todos, '2026-11-01');

    expect(rolledCount).toBe(1);

    // Completed task remains on 2026-10-31
    const t1 = rolled.find(t => t.id === 't1')!;
    expect(t1.date).toBe('2026-10-31');
    expect(t1.completed).toBe(true);

    // Uncompleted task moved to 2026-11-01 with rolledFromDate set
    const t2 = rolled.find(t => t.id === 't2')!;
    expect(t2.date).toBe('2026-11-01');
    expect(t2.rolledFromDate).toBe('2026-10-31');
    expect(t2.completed).toBe(false);

    // Existing task on today unchanged
    const t3 = rolled.find(t => t.id === 't3')!;
    expect(t3.date).toBe('2026-11-01');
  });

  it('is completely idempotent when run multiple times on the same day', () => {
    const todos: DailyTodo[] = [
      {
        id: 't1',
        title: 'Unfinished errand',
        date: '2026-10-30',
        completed: false,
        completedAt: null,
        notes: '',
        buildId: null,
        order: 0,
        createdAt: '',
        updatedAt: ''
      }
    ];

    const run1 = rolloverUnfinishedTodos(todos, '2026-11-01');
    expect(run1.rolledCount).toBe(1);

    const run2 = rolloverUnfinishedTodos(run1.todos, '2026-11-01');
    expect(run2.rolledCount).toBe(0);
    expect(run2.todos.length).toBe(1);
    expect(run2.todos[0].date).toBe('2026-11-01');
    expect(run2.todos[0].rolledFromDate).toBe('2026-10-30');
  });
});
