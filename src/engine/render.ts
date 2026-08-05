import type { GeneratorProject, ListId, OutputBlock } from '@/model/types';
import type { EvalContext } from './context';
import { makeContext } from './context';
import { evalTemplate, selectOne } from './evaluate';
import { resolveList } from './resolve';

/** Escape a string for use in an HTML attribute value. */
function attr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Escape text for safe display in a plain-text UI label. */
function escLabel(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Render the entire output template to an HTML string for the preview iframe.
 * Interactive elements carry data-perch-* attributes; the iframe harness wires
 * them to postMessage so the parent (which owns the engine + state) can react.
 */
export function renderOutputHtml(project: GeneratorProject, ctx: EvalContext): string {
  return project.output.blocks.map((b) => renderBlock(b, ctx)).join('\n');
}

function renderBlock(block: OutputBlock, ctx: EvalContext): string {
  switch (block.kind) {
    case 'html': {
      if (block.tag === 'br') return '<br />';
      const attrs = Object.entries(block.attrs ?? {})
        .map(([k, v]) => ` ${k}="${attr(v)}"`)
        .join('');
      return `<${block.tag}${attrs}>${evalTemplate(block.content, ctx)}</${block.tag}>`;
    }
    case 'outputRef': {
      const inner = renderOutputRefInner(block.listId, ctx);
      return `<span id="${attr(block.domId)}" data-perch-out="${attr(block.listId)}">${inner}</span>`;
    }
    case 'button': {
      const targets =
        block.action.type === 'update' ? block.action.targetDomIds.join(' ') : '';
      return `<button type="button" class="perch-btn" data-perch-action="update" data-perch-targets="${attr(targets)}">${escLabel(block.label)}</button>`;
    }
    case 'textInput': {
      const val = ctx.scope.get(block.bindVar) ?? '';
      const label = block.label ? `<label class="perch-label">${escLabel(block.label)}</label>` : '';
      return `<div class="perch-field">${label}<input type="text" class="perch-input" data-perch-bind="${attr(block.bindVar)}" placeholder="${attr(block.placeholder ?? '')}" value="${attr(val)}" /></div>`;
    }
    case 'select': {
      const options = selectOptions(block, ctx);
      const current = ctx.scope.get(block.bindVar) ?? '';
      const label = block.label ? `<label class="perch-label">${escLabel(block.label)}</label>` : '';
      const opts = options
        .map(
          (o) =>
            `<option value="${attr(o)}"${o === current ? ' selected' : ''}>${escLabel(o)}</option>`,
        )
        .join('');
      return `<div class="perch-field">${label}<select class="perch-input" data-perch-bind="${attr(block.bindVar)}">${opts}</select></div>`;
    }
    case 'checkbox': {
      const checked = (ctx.scope.get(block.bindVar) ?? '') === 'true';
      const label = block.label ? escLabel(block.label) : '';
      return `<label class="perch-check"><input type="checkbox" data-perch-bind="${attr(block.bindVar)}"${checked ? ' checked' : ''} /> ${label}</label>`;
    }
    case 'pluginBlock': {
      const parts = block.args.map((a) => `${escLabel(a.key)}: ${escLabel(evalTemplate(a.value, ctx))}`);
      return `<div class="perch-plugin">⟨${escLabel(block.importName)}⟩${parts.length ? '<br /><small>' + parts.join(' · ') + '</small>' : ''}</div>`;
    }
    default: {
      const _exhaustive: never = block;
      return String(_exhaustive);
    }
  }
}

function selectOptions(
  block: Extract<OutputBlock, { kind: 'select' }>,
  ctx: EvalContext,
): string[] {
  if (block.options?.length) return block.options;
  if (block.optionsListId) {
    const node = resolveList({ listId: block.optionsListId }, ctx);
    if (node) return node.items.map((it) => evalTemplate(it.content, ctx));
  }
  return [];
}

/** Evaluate a single list reference for an outputRef block (implicit selectOne). */
export function renderOutputRefInner(listId: ListId, ctx: EvalContext): string {
  const node = resolveList({ listId }, ctx);
  if (!node) return `⟨?${listId}⟩`;
  return selectOne(node, ctx);
}

/** Convenience: build a context and render the full output in one call. */
export function renderProject(
  project: GeneratorProject,
  opts: { seed?: number; scope?: Record<string, string> } = {},
): string {
  const ctx = makeContext(project, opts);
  return renderOutputHtml(project, ctx);
}
