/** Small monotonic id helper. Not cryptographic — just unique within a session. */

let counter = 0;

export function makeId(prefix = 'n'): string {
  counter += 1;
  return `${prefix}_${counter.toString(36)}_${Date.now().toString(36)}`;
}

/** Reset the counter — used by tests for stable ids. */
export function _resetIdsForTest(): void {
  counter = 0;
}
