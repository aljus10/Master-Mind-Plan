import { describe, it, expect } from 'vitest';
import {
  calculateProgress,
  deriveStatusFromSubtasks,
  isTaskReady,
  getTaskBlockerInfo
} from '../domain/readiness';
import { wouldIntroduceCycle, validateNoCycles } from '../domain/cycles';
import {
  getMonthViewGrid,
  getWeekViewGrid,
  shiftMonth,
  shiftWeek,
  formatFriendlyDate
} from '../domain/dates';
import { mergeWorkspaces } from '../storage/merge';
import { validateBackupJson } from '../storage/validation';
import { Task, Workspace } from '../domain/types';

describe('Progress Calculation', () => {
  it('handles empty task list as unplanned', () => {
    const res = calculateProgress([]);
    expect(res.isUnplanned).toBe(true);
    expect(res.label).toBe('Not planned yet');
    expect(res.percentage).toBe(0);
  });

  it('counts leaf units accurately without double-counting parent tasks', () => {
    const tasks: Task[] = [
      // Root task without subtasks (counts as 1 leaf unit, done)
      {
        id: 't1',
        buildId: 'b1',
        milestoneId: 'm1',
        title: 'Task 1',
        description: '',
        status: 'done',
        priority: 'normal',
        order: 0,
        boardOrder: 0,
        plannedDate: null,
        calendarOrder: 0,
        blocker: '',
        prerequisiteTaskIds: [],
        subtasks: [],
        createdAt: '',
        updatedAt: ''
      },
      // Root task with 3 subtasks (parent does NOT count, only 3 subtasks count; 2 are done)
      {
        id: 't2',
        buildId: 'b1',
        milestoneId: 'm1',
        title: 'Task 2 with subtasks',
        description: '',
        status: 'doing',
        priority: 'normal',
        order: 1,
        boardOrder: 1,
        plannedDate: null,
        calendarOrder: 1,
        blocker: '',
        prerequisiteTaskIds: [],
        subtasks: [
          { id: 's1', title: 'Sub 1', done: true, order: 0 },
          { id: 's2', title: 'Sub 2', done: true, order: 1 },
          { id: 's3', title: 'Sub 3', done: false, order: 2 }
        ],
        createdAt: '',
        updatedAt: ''
      }
    ];

    const progress = calculateProgress(tasks);
    // Total leaf units = 1 (from t1) + 3 (from t2) = 4
    // Done leaf units = 1 (from t1) + 2 (from t2) = 3
    expect(progress.totalLeafUnits).toBe(4);
    expect(progress.doneLeafUnits).toBe(3);
    expect(progress.percentage).toBe(75);
    expect(progress.label).toBe('3 / 4 steps (75%)');
  });
});

describe('Subtask Status Transitions', () => {
  it('updates task to done when all subtasks are done', () => {
    const subtasks = [
      { id: 's1', title: 'Sub 1', done: true, order: 0 },
      { id: 's2', title: 'Sub 2', done: true, order: 1 }
    ];
    expect(deriveStatusFromSubtasks('doing', subtasks, false)).toBe('done');
  });

  it('updates task to doing when some subtasks are done', () => {
    const subtasks = [
      { id: 's1', title: 'Sub 1', done: true, order: 0 },
      { id: 's2', title: 'Sub 2', done: false, order: 1 }
    ];
    expect(deriveStatusFromSubtasks('todo', subtasks, false)).toBe('doing');
  });

  it('preserves blocked status if manually blocked', () => {
    const subtasks = [
      { id: 's1', title: 'Sub 1', done: true, order: 0 },
      { id: 's2', title: 'Sub 2', done: false, order: 1 }
    ];
    expect(deriveStatusFromSubtasks('blocked', subtasks, true)).toBe('blocked');
  });

  it('reverts done task to todo when all subtasks are undone', () => {
    const subtasks = [
      { id: 's1', title: 'Sub 1', done: false, order: 0 },
      { id: 's2', title: 'Sub 2', done: false, order: 1 }
    ];
    expect(deriveStatusFromSubtasks('done', subtasks, false)).toBe('todo');
  });
});

describe('Dependency Cycle Detection', () => {
  it('rejects self-dependency', () => {
    const tasks: Task[] = [];
    expect(wouldIntroduceCycle(tasks, 'task-1', 'task-1')).toBe(true);
  });

  it('detects direct 2-node cycle', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        buildId: 'b1',
        milestoneId: 'm1',
        title: 'T1',
        description: '',
        status: 'todo',
        priority: 'normal',
        order: 0,
        boardOrder: 0,
        plannedDate: null,
        calendarOrder: 0,
        blocker: '',
        prerequisiteTaskIds: ['t2'],
        subtasks: [],
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 't2',
        buildId: 'b1',
        milestoneId: 'm1',
        title: 'T2',
        description: '',
        status: 'todo',
        priority: 'normal',
        order: 1,
        boardOrder: 1,
        plannedDate: null,
        calendarOrder: 1,
        blocker: '',
        prerequisiteTaskIds: [],
        subtasks: [],
        createdAt: '',
        updatedAt: ''
      }
    ];

    // If t1 depends on t2, adding t1 as a prerequisite to t2 would create t2 -> t1 -> t2 cycle
    expect(wouldIntroduceCycle(tasks, 't2', 't1')).toBe(true);
  });

  it('detects 3-node cycle', () => {
    const tasks: Task[] = [
      {
        id: 'a',
        buildId: 'b1',
        milestoneId: 'm1',
        title: 'A',
        description: '',
        status: 'todo',
        priority: 'normal',
        order: 0,
        boardOrder: 0,
        plannedDate: null,
        calendarOrder: 0,
        blocker: '',
        prerequisiteTaskIds: ['b'],
        subtasks: [],
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'b',
        buildId: 'b1',
        milestoneId: 'm1',
        title: 'B',
        description: '',
        status: 'todo',
        priority: 'normal',
        order: 1,
        boardOrder: 1,
        plannedDate: null,
        calendarOrder: 1,
        blocker: '',
        prerequisiteTaskIds: ['c'],
        subtasks: [],
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'c',
        buildId: 'b1',
        milestoneId: 'm1',
        title: 'C',
        description: '',
        status: 'todo',
        priority: 'normal',
        order: 2,
        boardOrder: 2,
        plannedDate: null,
        calendarOrder: 2,
        blocker: '',
        prerequisiteTaskIds: [],
        subtasks: [],
        createdAt: '',
        updatedAt: ''
      }
    ];

    // C cannot depend on A because A depends on B and B depends on C
    expect(wouldIntroduceCycle(tasks, 'c', 'a')).toBe(true);
  });
});

describe('Task Readiness and Blockers', () => {
  it('evaluates readiness accurately based on prerequisites', () => {
    const prereq: Task = {
      id: 'p1',
      buildId: 'b1',
      milestoneId: 'm1',
      title: 'Prerequisite Task',
      description: '',
      status: 'doing',
      priority: 'normal',
      order: 0,
      boardOrder: 0,
      plannedDate: null,
      calendarOrder: 0,
      blocker: '',
      prerequisiteTaskIds: [],
      subtasks: [],
      createdAt: '',
      updatedAt: ''
    };

    const dependent: Task = {
      id: 'd1',
      buildId: 'b1',
      milestoneId: 'm1',
      title: 'Dependent Task',
      description: '',
      status: 'todo',
      priority: 'normal',
      order: 1,
      boardOrder: 1,
      plannedDate: null,
      calendarOrder: 1,
      blocker: '',
      prerequisiteTaskIds: ['p1'],
      subtasks: [],
      createdAt: '',
      updatedAt: ''
    };

    const allTasks = [prereq, dependent];
    expect(isTaskReady(dependent, allTasks)).toBe(false);
    expect(getTaskBlockerInfo(dependent, allTasks).isBlocked).toBe(true);

    // Now mark prerequisite done
    prereq.status = 'done';
    expect(isTaskReady(dependent, allTasks)).toBe(true);
    expect(getTaskBlockerInfo(dependent, allTasks).isBlocked).toBe(false);
  });
});

describe('Date Calculations & Calendar Grid', () => {
  it('generates correct Monday-first month grid for October 2026', () => {
    const grid = getMonthViewGrid('2026-10-05');
    expect(grid.title).toContain('October');
    expect(grid.title).toContain('2026');
    expect(grid.days.length % 7).toBe(0);

    // October 1, 2026 is a Thursday.
    // Monday-first grid must start on Monday Sep 28, 2026.
    expect(grid.days[0].date).toBe('2026-09-28');
    expect(grid.days[0].isCurrentMonth).toBe(false);

    // Day 3 (0-indexed) is Oct 1
    expect(grid.days[3].date).toBe('2026-10-01');
    expect(grid.days[3].isCurrentMonth).toBe(true);
  });

  it('handles leap year February 2028 correctly', () => {
    const grid = getMonthViewGrid('2028-02-15');
    expect(grid.title).toContain('February');
    expect(grid.title).toContain('2028');

    // Feb 29, 2028 must be in the current month
    const feb29 = grid.days.find(d => d.date === '2028-02-29');
    expect(feb29).toBeDefined();
    expect(feb29?.isCurrentMonth).toBe(true);
  });

  it('generates correct 7-day week grid', () => {
    const week = getWeekViewGrid('2026-10-06');
    expect(week.days.length).toBe(7);
    // Week containing Oct 6, 2026 (Tuesday) starts on Monday Oct 5
    expect(week.days[0].date).toBe('2026-10-05');
    expect(week.days[6].date).toBe('2026-10-11');
  });
});

describe('Import & Collision Remapping', () => {
  it('remaps colliding IDs and updates foreign keys during merge', () => {
    const existing: Workspace = {
      builds: [
        {
          id: 'b1',
          title: 'Existing Build',
          description: '',
          goal: '',
          definitionOfDone: '',
          status: 'active',
          order: 0,
          pinned: false,
          archivedAt: null,
          nextAction: null,
          constraints: { timeNotes: '', budgetNotes: '', resourceNotes: '' },
          planView: 'calendar',
          calendarView: 'month',
          calendarAnchorDate: '2026-10-05',
          createdAt: '',
          updatedAt: ''
        }
      ],
      milestones: [],
      tasks: [],
      ideas: [],
      features: [],
      notes: [],
      reviews: [],
      preferences: { startArea: 'builds', buildsView: 'board' }
    };

    const incoming: Workspace = {
      builds: [
        {
          id: 'b1', // Collides with existing 'b1'
          title: 'Imported Build',
          description: '',
          goal: '',
          definitionOfDone: '',
          status: 'planned',
          order: 0,
          pinned: false,
          archivedAt: null,
          nextAction: { taskId: 't1' },
          constraints: { timeNotes: '', budgetNotes: '', resourceNotes: '' },
          planView: 'calendar',
          calendarView: 'month',
          calendarAnchorDate: '2026-10-05',
          createdAt: '',
          updatedAt: ''
        }
      ],
      milestones: [
        {
          id: 'm1',
          buildId: 'b1',
          title: 'Milestone 1',
          outcome: '',
          order: 0,
          createdAt: '',
          updatedAt: ''
        }
      ],
      tasks: [
        {
          id: 't1',
          buildId: 'b1',
          milestoneId: 'm1',
          title: 'Task 1',
          description: '',
          status: 'todo',
          priority: 'normal',
          order: 0,
          boardOrder: 0,
          plannedDate: null,
          calendarOrder: 0,
          blocker: '',
          prerequisiteTaskIds: [],
          subtasks: [],
          createdAt: '',
          updatedAt: ''
        }
      ],
      ideas: [],
      features: [],
      notes: [],
      reviews: [],
      preferences: { startArea: 'next', buildsView: 'grid' }
    };

    const merged = mergeWorkspaces(existing, incoming);

    // Both builds exist
    expect(merged.builds.length).toBe(2);
    expect(merged.builds[0].id).toBe('b1');
    const importedBuild = merged.builds[1];
    expect(importedBuild.id).not.toBe('b1'); // Remapped!
    expect(importedBuild.title).toBe('Imported Build');

    // Milestone buildId is remapped to match the new build ID
    expect(merged.milestones[0].buildId).toBe(importedBuild.id);

    // Task buildId and milestoneId are properly updated
    expect(merged.tasks[0].buildId).toBe(importedBuild.id);
    expect(merged.tasks[0].milestoneId).toBe(merged.milestones[0].id);
  });
});
