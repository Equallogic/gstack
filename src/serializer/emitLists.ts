import type { ListItem, ListNode } from '@/model/types';
import type { SerializeContext } from './context';
import { indent } from './indent';
import { emitTemplate } from './emitTemplate';

/** Serialize all top-level lists (the "lists panel"). */
export function emitLists(ctx: SerializeContext): string {
  const blocks: string[] = [];

  // Imports first, then the top-level $output export contract, then lists.
  for (const imp of ctx.project.imports) {
    blocks.push(`${imp.importName} = {import:${imp.plugin}}`);
  }
  if (ctx.project.rootOutputListId) {
    blocks.push(`$output = ${ctx.nameOf(ctx.project.rootOutputListId)}`);
  }

  for (const id of ctx.project.listOrder) {
    const node = ctx.project.lists[id];
    if (node) blocks.push(emitListNode(node, 0, ctx));
  }

  return blocks.join('\n\n') + '\n';
}

function emitListNode(node: ListNode, level: number, ctx: SerializeContext): string {
  const lines: string[] = [indent(level) + node.name];

  if (node.outputConfig) {
    lines.push(`${indent(level + 1)}$output = ${emitTemplate(node.outputConfig.template, ctx)}`);
  }

  for (const item of node.items) {
    lines.push(emitItem(item, level + 1, ctx));
  }

  for (const child of Object.values(node.children ?? {})) {
    lines.push(emitListNode(child, level + 1, ctx));
  }

  return lines.join('\n');
}

function emitItem(item: ListItem, level: number, ctx: SerializeContext): string {
  const body = emitTemplate(item.content, ctx);
  const weight = emitWeight(item.weight);
  const lines = [indent(level) + body + weight];

  // Object-list properties are indented one further level under the item.
  for (const [key, value] of Object.entries(item.properties ?? {})) {
    lines.push(`${indent(level + 1)}${key} = ${emitTemplate(value, ctx)}`);
  }

  return lines.join('\n');
}

function emitWeight(weight: ListItem['weight']): string {
  if (weight == null) return '';
  if (typeof weight === 'number') return weight === 1 ? '' : ` ^${weight}`;
  return ` ^[${weight.expr}]`;
}
