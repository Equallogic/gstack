import type { DragEndEvent } from '@dnd-kit/core';
import { useProjectStore } from '@/store/useProjectStore';
import { isPluginKey, makeBlockFor, paletteItem, type Zone } from '@/catalog/components';

/** Which canvas zone does a drop target id belong to? */
function zoneOf(overId: string): Zone | undefined {
  if (overId === 'zone:lists' || overId.startsWith('item:')) return 'lists';
  if (overId === 'zone:output' || overId.startsWith('block:')) return 'output';
  return undefined;
}

/** Handle every drag end: palette drops and sortable reorders. */
export function handleDragEnd(event: DragEndEvent): void {
  const { active, over } = event;
  if (!over) return;
  const activeId = String(active.id);
  const overId = String(over.id);
  const store = useProjectStore.getState();

  // ── Palette drop → create a component ──
  const data = active.data.current as { source?: string; key?: string } | undefined;
  if (data?.source === 'palette' && data.key) {
    const item = paletteItem(data.key);
    if (!item) return;
    const zone = zoneOf(overId) ?? item.zone;
    if (item.key === 'list' && zone === 'lists') {
      store.addList();
      return;
    }
    if (isPluginKey(item.key) && zone === 'output') {
      store.addPluginComponent(item.key);
      return;
    }
    if (zone === 'output') {
      const project = store.project;
      const outputRefs = project.output.blocks.filter((b) => b.kind === 'outputRef');
      const block = makeBlockFor(item.key, {
        firstListId: project.listOrder[0],
        outputDomIds: outputRefs.map((b) => (b.kind === 'outputRef' ? b.domId : '')).filter(Boolean),
        outputCount: outputRefs.length,
      });
      if (block) store.addBlock(block);
    }
    return;
  }

  if (activeId === overId) return;

  // ── Sortable reorder: list items ──
  if (activeId.startsWith('item:') && overId.startsWith('item:')) {
    const [, activeListId, activeItemId] = activeId.split(':');
    const [, overListId, overItemId] = overId.split(':');
    if (activeListId !== overListId) return; // cross-list moves not supported yet
    const list = store.project.lists[activeListId];
    if (!list) return;
    const from = list.items.findIndex((it) => it.id === activeItemId);
    const to = list.items.findIndex((it) => it.id === overItemId);
    if (from >= 0 && to >= 0) store.reorderItems(activeListId, from, to);
    return;
  }

  // ── Sortable reorder: output blocks ──
  if (activeId.startsWith('block:') && overId.startsWith('block:')) {
    const blocks = store.project.output.blocks;
    const from = blocks.findIndex((b) => `block:${b.id}` === activeId);
    const to = blocks.findIndex((b) => `block:${b.id}` === overId);
    if (from >= 0 && to >= 0) store.reorderBlocks(from, to);
  }
}
