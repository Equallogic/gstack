import type { GeneratorProject, ListNode } from '@/model/types';
import { makeRng, type Rng } from '@/lib/rng';

/** Runtime evaluation context threaded through the whole engine. */
export interface EvalContext {
  project: GeneratorProject;
  rng: Rng;
  /** Variable name -> current string value. */
  scope: Map<string, string>;
  /** Name -> list, for resolving references by raw name. */
  listsByName: Map<string, ListNode>;
  /** consumableList state: a synthetic key -> remaining item indices. */
  consumables: Map<string, number[]>;
  /** Property values of the object-list item currently being rendered ([this.x]). */
  thisScope?: Record<string, string>;
  /** Guards against runaway recursion in self-referential grammars. */
  depth: number;
}

const MAX_DEPTH = 200;

export function makeContext(
  project: GeneratorProject,
  opts: { seed?: number; scope?: Record<string, string> } = {},
): EvalContext {
  const seed = opts.seed ?? project.seed ?? 1;
  const listsByName = new Map<string, ListNode>();
  for (const id of project.listOrder) {
    const node = project.lists[id];
    if (node) listsByName.set(node.name, node);
  }
  // Include any lists not in listOrder as a safety net.
  for (const node of Object.values(project.lists)) {
    if (!listsByName.has(node.name)) listsByName.set(node.name, node);
  }
  const scope = new Map<string, string>();
  if (opts.scope) {
    for (const [k, v] of Object.entries(opts.scope)) scope.set(k, v);
  }
  return {
    project,
    rng: makeRng(seed),
    scope,
    listsByName,
    consumables: new Map(),
    depth: 0,
  };
}

export function guardDepth(ctx: EvalContext): void {
  ctx.depth += 1;
  if (ctx.depth > MAX_DEPTH) {
    throw new EngineRecursionError();
  }
}

export function releaseDepth(ctx: EvalContext): void {
  ctx.depth -= 1;
}

export class EngineRecursionError extends Error {
  constructor() {
    super('Maximum evaluation depth exceeded (possible infinite recursion in the grammar).');
    this.name = 'EngineRecursionError';
  }
}
