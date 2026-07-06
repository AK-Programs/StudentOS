/**
 * Generic helpers for JSON-backed localStorage CRUD.
 * Centralises the try/catch + JSON.parse/stringify boilerplate that is
 * repeated across supabaseChat, supabaseResources, and App.tsx.
 */

/**
 * Reads a JSON array from localStorage. Returns an empty array on any error.
 */
export function getLocalArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw && raw !== 'undefined') return JSON.parse(raw) as T[];
  } catch (_) { /* ignore */ }
  return [];
}

/**
 * Writes a JSON array to localStorage. Silently ignores quota/serialisation errors.
 */
export function setLocalArray<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (_) { /* ignore */ }
}

/**
 * Upserts an item into a localStorage-backed JSON array.
 * `matchFn` identifies whether an existing entry should be replaced.
 * New items are prepended by default (`prepend = true`).
 */
export function upsertLocalItem<T>(
  key: string,
  item: T,
  matchFn: (existing: T) => boolean,
  prepend = true,
): void {
  const all = getLocalArray<T>(key);
  const idx = all.findIndex(matchFn);
  if (idx >= 0) {
    all[idx] = item;
  } else if (prepend) {
    all.unshift(item);
  } else {
    all.push(item);
  }
  setLocalArray(key, all);
}

/**
 * Removes items matching `filterFn` from a localStorage-backed JSON array.
 */
export function removeLocalItems<T>(
  key: string,
  shouldRemove: (item: T) => boolean,
): void {
  const all = getLocalArray<T>(key);
  setLocalArray(key, all.filter(item => !shouldRemove(item)));
}
