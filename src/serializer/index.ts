import type { GeneratorProject } from '@/model/types';
import { makeSerializeContext } from './context';
import { emitLists } from './emitLists';
import { emitOutput } from './emitOutput';

export interface SerializedGenerator {
  /** The Perchance "lists panel" source. */
  lists: string;
  /** The Perchance "HTML panel" source. */
  html: string;
}

/**
 * Serialize a project to Perchance source: two strings, one per editor panel.
 * This is the product's correctness gate — the output must run verbatim when
 * pasted into perchance.org/editgen.
 */
export function serialize(project: GeneratorProject): SerializedGenerator {
  const ctx = makeSerializeContext(project);
  return {
    lists: emitLists(ctx),
    html: emitOutput(ctx),
  };
}

export { makeSerializeContext } from './context';
export { INDENT_UNIT } from './indent';
