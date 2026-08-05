import type { ListNode, RefTarget } from '@/model/types';
import type { EvalContext } from './context';

/** Resolve a RefTarget to a concrete list node (descending dotted paths). */
export function resolveList(target: RefTarget, ctx: EvalContext): ListNode | undefined {
  let node: ListNode | undefined;
  if (target.listId) {
    node = ctx.project.lists[target.listId];
  } else if (target.rawName) {
    node = ctx.listsByName.get(target.rawName);
  }
  if (!node) return undefined;
  if (target.path) {
    for (const segment of target.path.split('.')) {
      if (!segment) continue;
      node = node.children?.[segment];
      if (!node) return undefined;
    }
  }
  return node;
}

/** Human-readable label for an unresolved reference, used in preview fallbacks. */
export function targetLabel(target: RefTarget): string {
  if (target.rawName) return target.rawName + (target.path ? '.' + target.path : '');
  if (target.path) return target.path;
  return target.listId ?? '?';
}
