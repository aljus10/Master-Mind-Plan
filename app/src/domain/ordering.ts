import { Id } from './types';

/**
 * Reorders an item within a list of items having an `id` and `order` field.
 * Normalizes all `order` values to 0, 1, 2, ...
 */
export function reorderItems<T extends { id: Id; order: number }>(
  items: T[],
  sourceId: Id,
  targetIndex: number
): T[] {
  const current = [...items].sort((a, b) => a.order - b.order);
  const sourceIndex = current.findIndex(x => x.id === sourceId);
  if (sourceIndex === -1) return items;

  const [moved] = current.splice(sourceIndex, 1);
  const safeTargetIndex = Math.max(0, Math.min(targetIndex, current.length));
  current.splice(safeTargetIndex, 0, moved);

  return current.map((item, idx) => ({
    ...item,
    order: idx
  }));
}

/**
 * Moves an item up or down by 1 position.
 */
export function moveItemDirection<T extends { id: Id; order: number }>(
  items: T[],
  itemId: Id,
  direction: 'up' | 'down'
): T[] {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex(x => x.id === itemId);
  if (index === -1) return items;

  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= sorted.length) return items;

  return reorderItems(sorted, itemId, newIndex);
}

/**
 * Re-indexes a list of items to ensure contiguous 0-based orders.
 */
export function normalizeOrder<T extends { order: number }>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  return sorted.map((item, idx) => ({
    ...item,
    order: idx
  }));
}
