import type { OutputBlock } from '@/model/types';
import { makeId } from '@/model/ids';

/** Which canvas zone a palette component drops into. */
export type Zone = 'lists' | 'output';

export interface PaletteItem {
  /** Stable palette id, used as the dnd draggable id (prefixed "palette:"). */
  key: string;
  label: string;
  icon: string;
  zone: Zone;
  hint: string;
}

export const PALETTE: PaletteItem[] = [
  { key: 'list', label: 'List', icon: '≣', zone: 'lists', hint: 'A named list of random items.' },
  {
    key: 'output',
    label: 'Output',
    icon: '▶',
    zone: 'output',
    hint: 'Shows a list result, re-rollable by a button.',
  },
  { key: 'text', label: 'Text', icon: 'T', zone: 'output', hint: 'A line of static or templated text.' },
  { key: 'button', label: 'Button', icon: '⬒', zone: 'output', hint: 'Re-rolls the outputs.' },
  {
    key: 'textInput',
    label: 'Text input',
    icon: '⌶',
    zone: 'output',
    hint: 'Lets the user type a value into a variable.',
  },
  {
    key: 'select',
    label: 'Dropdown',
    icon: '▾',
    zone: 'output',
    hint: 'Lets the user pick a value into a variable.',
  },
  {
    key: 'aiImage',
    label: 'AI Image',
    icon: '🖼',
    zone: 'output',
    hint: 'Generates an image from a prompt (text-to-image-plugin).',
  },
  {
    key: 'aiText',
    label: 'AI Text',
    icon: '✎',
    zone: 'output',
    hint: 'Generates text from a prompt (ai-text-plugin).',
  },
];

/** Plugin components carry an import + a default call. */
export interface PluginDef {
  importName: string;
  plugin: string;
  /** Human labels for the args the Inspector should expose. */
  argKeys: string[];
  makeArgs(): { key: string; value: { kind: 'text'; value: string }[] }[];
}

export const PLUGIN_DEFS: Record<string, PluginDef> = {
  aiImage: {
    importName: 'image',
    plugin: 'text-to-image-plugin',
    argKeys: ['prompt', 'negativePrompt'],
    makeArgs: () => [{ key: 'prompt', value: [{ kind: 'text', value: 'a red fox in a snowy forest' }] }],
  },
  aiText: {
    importName: 'aiText',
    plugin: 'ai-text-plugin',
    argKeys: ['prompt'],
    makeArgs: () => [{ key: 'prompt', value: [{ kind: 'text', value: 'Write a short heroic name.' }] }],
  },
};

export function isPluginKey(key: string): boolean {
  return key in PLUGIN_DEFS;
}

export function paletteItem(key: string): PaletteItem | undefined {
  return PALETTE.find((p) => p.key === key);
}

/** Build a fresh output block for a palette key. Returns undefined for non-block keys. */
export function makeBlockFor(
  key: string,
  ctx: { firstListId?: string; outputDomIds: string[]; outputCount: number },
): OutputBlock | undefined {
  switch (key) {
    case 'output':
      if (!ctx.firstListId) return undefined;
      return {
        kind: 'outputRef',
        id: makeId('block'),
        listId: ctx.firstListId,
        domId: ctx.outputCount === 0 ? 'out' : `out${ctx.outputCount + 1}`,
      };
    case 'text':
      return {
        kind: 'html',
        id: makeId('block'),
        tag: 'p',
        content: [{ kind: 'text', value: 'Text' }],
      };
    case 'button':
      return {
        kind: 'button',
        id: makeId('block'),
        label: 'Generate',
        action: { type: 'update', targetDomIds: ctx.outputDomIds },
      };
    case 'textInput':
      return {
        kind: 'textInput',
        id: makeId('block'),
        label: 'Your input',
        bindVar: 'userInput',
        placeholder: 'Type here...',
      };
    case 'select':
      return {
        kind: 'select',
        id: makeId('block'),
        label: 'Choose',
        bindVar: 'choice',
        options: ['option A', 'option B'],
      };
    default:
      return undefined;
  }
}
