import { Position } from '@/types/position';
import { OrderItem } from '@/types/orders';

type SortableItem = Position | OrderItem;

/**
 * Compare two items based on sort field and direction
 * Used by both insertSorted and sortArray
 */
function compareItems(
  a: SortableItem,
  b: SortableItem,
  sortBy: string | null,
  sortDir: 'asc' | 'desc' | null,
): number {
  if (!sortBy) {
    // Default sort by openedAt/createdAt desc
    const dateA = new Date((a as any).openedAt || (a as any).createdAt || '').getTime();
    const dateB = new Date((b as any).openedAt || (b as any).createdAt || '').getTime();
    return dateB - dateA;
  }

  let aValue: any;
  let bValue: any;

  // String fields - case sensitive comparison
  if (sortBy === 'symbol') {
    aValue = (a as any).symbol || '';
    bValue = (b as any).symbol || '';
    const comparison = aValue.localeCompare(bValue);
    return sortDir === 'asc' ? comparison : -comparison;
  }

  // Date/Timestamp fields
  if (sortBy === 'openedAt' || sortBy === 'createdAt') {
    aValue = new Date((a as any).openedAt || (a as any).createdAt || '').getTime();
    bValue = new Date((b as any).openedAt || (b as any).createdAt || '').getTime();
  } else if (sortBy === 'closedAt') {
    aValue = new Date((a as any).closedAt || '').getTime();
    bValue = new Date((b as any).closedAt || '').getTime();
  }
  // Numeric fields
  else if (sortBy === 'quantity') {
    aValue = Number((a as any).quantity || 0);
    bValue = Number((b as any).quantity || 0);
  } else if (sortBy === 'realizedPnL') {
    aValue = Number((a as any).realizedPnL || 0);
    bValue = Number((b as any).realizedPnL || 0);
  } else if (sortBy === 'side') {
    aValue = (a as any).side || 0;
    bValue = (b as any).side || 0;
  } else if (sortBy === 'orderType') {
    aValue = (a as any).orderType || 0;
    bValue = (b as any).orderType || 0;
  } else if (sortBy === 'status') {
    aValue = (a as any).status || 0;
    bValue = (b as any).status || 0;
  }

  // If field not recognized, return 0
  if (aValue === undefined || bValue === undefined) {
    return 0;
  }

  // Numeric comparison
  const diff = aValue - bValue;
  return sortDir === 'asc' ? diff : -diff;
}

/**
 * Sort entire array by sortBy field and direction
 * @param arr - Array to sort
 * @param sortBy - Sort field (null = default by date desc)
 * @param sortDir - Sort direction ('asc' | 'desc' | null)
 */
export function sortArray<T extends SortableItem>(
  arr: T[],
  sortBy: string | null,
  sortDir: 'asc' | 'desc' | null,
): T[] {
  const sorted = [...arr];
  sorted.sort((a, b) => compareItems(a, b, sortBy, sortDir));
  return sorted;
}

/**
 * Insert a new item into array at the correct position based on sort field and direction
 * Tối ưu hơn khi list lớn - không cần sort lại toàn bộ
 *
 * @param arr - Current sorted array
 * @param newItem - New position/order to insert
 * @param sortBy - Sort field (null = default, or field name like 'symbol', 'openedAt', etc.)
 * @param sortDir - Sort direction ('asc' | 'desc' | null)
 */
export function insertSorted<T extends SortableItem>(
  arr: T[],
  newItem: T,
  sortBy: string | null,
  sortDir: 'asc' | 'desc' | null,
): T[] {
  const newArr = [...arr];

  // Find correct insertion position
  let insertIndex = 0;
  for (let i = 0; i < newArr.length; i++) {
    // If new item should come BEFORE current item, insert before it
    if (compareItems(newItem, newArr[i], sortBy, sortDir) < 0) {
      insertIndex = i;
      break;
    }
    insertIndex = i + 1;
  }

  newArr.splice(insertIndex, 0, newItem);
  return newArr;
}
