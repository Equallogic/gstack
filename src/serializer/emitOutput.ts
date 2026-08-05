import type { OutputBlock } from '@/model/types';
import type { SerializeContext } from './context';
import { emitTemplate } from './emitTemplate';

/**
 * Serialize the output template to the Perchance "HTML panel".
 * Interactive controls become the exact HTML + inline handlers Perchance uses:
 *   - buttons call update(domId)
 *   - inputs set a variable via oninput="var = this.value, update()"
 */
export function emitOutput(ctx: SerializeContext): string {
  return ctx.project.output.blocks.map((b) => emitBlock(b, ctx)).join('\n');
}

function emitBlock(block: OutputBlock, ctx: SerializeContext): string {
  switch (block.kind) {
    case 'html': {
      if (block.tag === 'br') return '<br>';
      const attrs = Object.entries(block.attrs ?? {})
        .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
        .join('');
      return `<${block.tag}${attrs}>${emitTemplate(block.content, ctx)}</${block.tag}>`;
    }
    case 'outputRef':
      return `<span id="${escapeAttr(block.domId)}">[${ctx.nameOf(block.listId)}]</span>`;
    case 'button': {
      const arg =
        block.action.type === 'update'
          ? block.action.targetDomIds.join(', ')
          : '';
      const handler =
        block.action.type === 'update'
          ? `update(${arg})`
          : block.action.raw;
      return `<button onclick="${escapeAttr(handler)}">${escapeText(block.label)}</button>`;
    }
    case 'textInput': {
      const ph = block.placeholder ? ` placeholder="${escapeAttr(block.placeholder)}"` : '';
      const label = block.label ? `${escapeText(block.label)} ` : '';
      return `${label}<input type="text"${ph} oninput="${block.bindVar} = this.value, update()">`;
    }
    case 'select': {
      const label = block.label ? `${escapeText(block.label)} ` : '';
      const opts = (block.options ?? [])
        .map((o) => `<option value="${escapeAttr(o)}">${escapeText(o)}</option>`)
        .join('');
      return `${label}<select oninput="${block.bindVar} = this.value, update()">${opts}</select>`;
    }
    case 'checkbox': {
      const label = block.label ? ` ${escapeText(block.label)}` : '';
      return `<label><input type="checkbox" oninput="${block.bindVar} = this.checked, update()">${label}</label>`;
    }
    case 'pluginBlock': {
      const args = block.args
        .map((a) => `${a.key}: '${emitTemplate(a.value, ctx).replace(/'/g, "\\'")}'`)
        .join(', ');
      return `[${block.importName}(${args ? `{${args}}` : ''})]`;
    }
    default: {
      const _exhaustive: never = block;
      return String(_exhaustive);
    }
  }
}

function escapeAttr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeText(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
