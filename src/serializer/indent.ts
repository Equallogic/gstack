/**
 * The single authority for indentation in emitted Perchance source.
 *
 * Perchance treats indentation as strict and structural ("1 tab OR 2 spaces"
 * per level). We commit to TWO SPACES everywhere and route every emitter
 * through this one function, so whitespace is never produced ad hoc. Golden
 * tests pin the exact bytes.
 */
export const INDENT_UNIT = '  '; // two spaces

export function indent(level: number): string {
  return INDENT_UNIT.repeat(Math.max(0, level));
}
