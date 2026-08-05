import type { GeneratorProject, TemplateNode } from './types';

export type WarningLevel = 'error' | 'warn' | 'info';

export interface Warning {
  level: WarningLevel;
  message: string;
}

const SLUG_RE = /^[a-z0-9-]{4,}$/;

/** Validate a project for common problems. Non-blocking; surfaced in export. */
export function validateProject(project: GeneratorProject): Warning[] {
  const warnings: Warning[] = [];
  const listIds = new Set(Object.keys(project.lists));

  // Duplicate list names.
  const nameCounts = new Map<string, number>();
  for (const list of Object.values(project.lists)) {
    nameCounts.set(list.name, (nameCounts.get(list.name) ?? 0) + 1);
  }
  for (const [name, count] of nameCounts) {
    if (count > 1) {
      warnings.push({ level: 'error', message: `Two or more lists are named "${name}". Names must be unique.` });
    }
    if (name.trim() === '') {
      warnings.push({ level: 'error', message: 'A list has an empty name.' });
    }
  }

  // Empty lists.
  for (const list of Object.values(project.lists)) {
    if (list.items.length === 0) {
      warnings.push({ level: 'warn', message: `List "${list.name}" has no items.` });
    }
  }

  // Broken listId references inside item templates.
  for (const list of Object.values(project.lists)) {
    for (const item of list.items) {
      collectRefWarnings(item.content, listIds, warnings, project);
    }
  }

  // Output blocks referencing missing lists.
  for (const block of project.output.blocks) {
    if (block.kind === 'outputRef' && !listIds.has(block.listId)) {
      warnings.push({ level: 'error', message: `An output block points to a list that no longer exists.` });
    }
  }
  if (project.output.blocks.length === 0) {
    warnings.push({ level: 'warn', message: 'The generator has no output UI. Add an Output block so something shows.' });
  }

  // Slug format.
  if (project.meta.slug && !SLUG_RE.test(project.meta.slug)) {
    warnings.push({
      level: 'warn',
      message: `URL "${project.meta.slug}" is invalid. Use 4+ lowercase letters, numbers, and hyphens.`,
    });
  }

  return warnings;
}

function collectRefWarnings(
  nodes: TemplateNode[],
  listIds: Set<string>,
  warnings: Warning[],
  project: GeneratorProject,
): void {
  for (const node of nodes) {
    if (node.kind === 'ref' && node.target.listId && !listIds.has(node.target.listId)) {
      warnings.push({ level: 'error', message: 'A reference points to a list that no longer exists.' });
    }
    if (node.kind === 'inline') {
      for (const opt of node.options) collectRefWarnings(opt, listIds, warnings, project);
    }
    if (node.kind === 'cond') {
      collectRefWarnings(node.then, listIds, warnings, project);
      collectRefWarnings(node.else, listIds, warnings, project);
    }
  }
}
