import { create } from 'zustand';
import type {
  GeneratorProject,
  ListId,
  ListItem,
  ListNode,
  OutputBlock,
} from '@/model/types';
import { makeStarterProject, makeItem, makeList } from '@/model/defaults';
import { textToTemplate } from '@/model/templateText';
import { PLUGIN_DEFS } from '@/catalog/components';
import { makeId } from '@/model/ids';
import { randomSeed } from '@/lib/rng';

export type Selection =
  | { kind: 'list'; listId: ListId }
  | { kind: 'item'; listId: ListId; itemId: string }
  | { kind: 'block'; blockId: string }
  | null;

interface ProjectState {
  project: GeneratorProject;
  selection: Selection;
  /** Preview seed; bumping it re-rolls the live preview. */
  previewSeed: number;

  select(selection: Selection): void;
  reroll(): void;

  // Project-level
  setProjectName(name: string): void;
  setSlug(slug: string): void;
  loadProject(project: GeneratorProject): void;

  // Lists
  addList(name?: string): ListId;
  renameList(listId: ListId, name: string): void;
  removeList(listId: ListId): void;

  // Items
  addItem(listId: ListId, content?: string): void;
  updateItemText(listId: ListId, itemId: string, text: string): void;
  setItemWeight(listId: ListId, itemId: string, weight: number | undefined): void;
  removeItem(listId: ListId, itemId: string): void;
  reorderItems(listId: ListId, from: number, to: number): void;

  // Output blocks
  addBlock(block: OutputBlock): void;
  updateBlock(blockId: string, patch: Partial<OutputBlock>): void;
  removeBlock(blockId: string): void;
  reorderBlocks(from: number, to: number): void;

  // Plugins
  addPluginComponent(pluginKey: string): void;
  setPluginArg(blockId: string, key: string, value: string): void;
}

/** Produce a fresh project object (immutable update helper). */
function withProject(
  state: ProjectState,
  mutate: (draft: GeneratorProject) => void,
): Partial<ProjectState> {
  const next = structuredClone(state.project);
  mutate(next);
  return { project: next };
}

function uniqueListName(project: GeneratorProject, base: string): string {
  const taken = new Set(Object.values(project.lists).map((l) => l.name));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}${i}`)) i += 1;
  return `${base}${i}`;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: makeStarterProject(),
  selection: null,
  previewSeed: 1,

  select(selection) {
    set({ selection });
  },
  reroll() {
    set({ previewSeed: randomSeed() });
  },

  setProjectName(name) {
    set((s) => withProject(s, (p) => void (p.meta.name = name)));
  },
  setSlug(slug) {
    set((s) => withProject(s, (p) => void (p.meta.slug = slug)));
  },
  loadProject(project) {
    set({ project, selection: null });
  },

  addList(name) {
    const list: ListNode = makeList(uniqueListName(get().project, name ?? 'newList'));
    set((s) =>
      withProject(s, (p) => {
        p.lists[list.id] = list;
        p.listOrder.push(list.id);
      }),
    );
    return list.id;
  },
  renameList(listId, name) {
    set((s) =>
      withProject(s, (p) => {
        const l = p.lists[listId];
        if (l) l.name = name;
      }),
    );
  },
  removeList(listId) {
    set((s) =>
      withProject(s, (p) => {
        delete p.lists[listId];
        p.listOrder = p.listOrder.filter((id) => id !== listId);
      }),
    );
    if (get().selection?.kind === 'list' && (get().selection as { listId: ListId }).listId === listId) {
      set({ selection: null });
    }
  },

  addItem(listId, content) {
    const item: ListItem = makeItem(content ?? 'new item');
    set((s) =>
      withProject(s, (p) => {
        p.lists[listId]?.items.push(item);
      }),
    );
  },
  updateItemText(listId, itemId, text) {
    set((s) =>
      withProject(s, (p) => {
        const item = p.lists[listId]?.items.find((it) => it.id === itemId);
        if (item) item.content = textToTemplate(text, p);
      }),
    );
  },
  setItemWeight(listId, itemId, weight) {
    set((s) =>
      withProject(s, (p) => {
        const item = p.lists[listId]?.items.find((it) => it.id === itemId);
        if (item) {
          if (weight == null || weight === 1) delete item.weight;
          else item.weight = weight;
        }
      }),
    );
  },
  removeItem(listId, itemId) {
    set((s) =>
      withProject(s, (p) => {
        const l = p.lists[listId];
        if (l) l.items = l.items.filter((it) => it.id !== itemId);
      }),
    );
  },
  reorderItems(listId, from, to) {
    set((s) =>
      withProject(s, (p) => {
        const l = p.lists[listId];
        if (!l) return;
        const [moved] = l.items.splice(from, 1);
        if (moved) l.items.splice(to, 0, moved);
      }),
    );
  },

  addBlock(block) {
    set((s) => withProject(s, (p) => void p.output.blocks.push(block)));
  },
  updateBlock(blockId, patch) {
    set((s) =>
      withProject(s, (p) => {
        const idx = p.output.blocks.findIndex((b) => b.id === blockId);
        if (idx >= 0) {
          p.output.blocks[idx] = { ...p.output.blocks[idx], ...patch } as OutputBlock;
        }
      }),
    );
  },
  removeBlock(blockId) {
    set((s) =>
      withProject(s, (p) => {
        p.output.blocks = p.output.blocks.filter((b) => b.id !== blockId);
      }),
    );
  },
  reorderBlocks(from, to) {
    set((s) =>
      withProject(s, (p) => {
        const [moved] = p.output.blocks.splice(from, 1);
        if (moved) p.output.blocks.splice(to, 0, moved);
      }),
    );
  },

  addPluginComponent(pluginKey) {
    const def = PLUGIN_DEFS[pluginKey];
    if (!def) return;
    set((s) =>
      withProject(s, (p) => {
        if (!p.imports.some((imp) => imp.importName === def.importName)) {
          p.imports.push({ id: makeId('imp'), importName: def.importName, plugin: def.plugin });
        }
        p.output.blocks.push({
          kind: 'pluginBlock',
          id: makeId('block'),
          importName: def.importName,
          args: def.makeArgs(),
        });
      }),
    );
  },
  setPluginArg(blockId, key, value) {
    set((s) =>
      withProject(s, (p) => {
        const block = p.output.blocks.find((b) => b.id === blockId);
        if (block?.kind !== 'pluginBlock') return;
        const existing = block.args.find((a) => a.key === key);
        if (value === '') {
          block.args = block.args.filter((a) => a.key !== key);
        } else if (existing) {
          existing.value = [{ kind: 'text', value }];
        } else {
          block.args.push({ key, value: [{ kind: 'text', value }] });
        }
      }),
    );
  },
}));
