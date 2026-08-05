import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ListItem, ListNode } from '@/model/types';
import { useProjectStore } from '@/store/useProjectStore';
import { templateToText } from '@/model/templateText';

function ItemRow({
  listId,
  item,
  nameOf,
}: {
  listId: string;
  item: ListItem;
  nameOf: (id: string) => string;
}): React.ReactElement {
  const updateItemText = useProjectStore((s) => s.updateItemText);
  const setItemWeight = useProjectStore((s) => s.setItemWeight);
  const removeItem = useProjectStore((s) => s.removeItem);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `item:${listId}:${item.id}`,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 ${isDragging ? 'opacity-60' : ''}`}
    >
      <span
        className="cursor-grab select-none px-1 text-gray-600 hover:text-gray-300"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⠿
      </span>
      <input
        className="flex-1 rounded border border-stage-border bg-black/30 px-2 py-1 font-mono text-xs text-gray-200 focus:border-sky-500 focus:outline-none"
        value={templateToText(item.content, nameOf)}
        spellCheck={false}
        onChange={(e) => updateItemText(listId, item.id, e.target.value)}
      />
      <input
        className="w-14 rounded border border-stage-border bg-black/30 px-1 py-1 text-center font-mono text-xs text-amber-300 focus:border-sky-500 focus:outline-none"
        type="number"
        min={0}
        step="0.1"
        title="Weight (^)"
        value={typeof item.weight === 'number' ? item.weight : ''}
        placeholder="1"
        onChange={(e) => {
          const v = e.target.value.trim();
          setItemWeight(listId, item.id, v === '' ? undefined : Number(v));
        }}
      />
      <button
        type="button"
        className="text-xs text-gray-600 hover:text-red-400"
        onClick={() => removeItem(listId, item.id)}
        title="Remove item"
      >
        ✕
      </button>
    </li>
  );
}

function ListCard({ list }: { list: ListNode }): React.ReactElement {
  const lists = useProjectStore((s) => s.project.lists);
  const nameOf = (id: string): string => lists[id]?.name ?? id;
  const renameList = useProjectStore((s) => s.renameList);
  const removeList = useProjectStore((s) => s.removeList);
  const addItem = useProjectStore((s) => s.addItem);

  return (
    <div className="rounded-lg border border-stage-border bg-stage-panel p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-mono text-sm font-semibold text-sky-300 hover:border-stage-border focus:border-sky-500 focus:outline-none"
          value={list.name}
          spellCheck={false}
          onChange={(e) => renameList(list.id, e.target.value)}
        />
        <button
          type="button"
          className="text-xs text-gray-500 hover:text-red-400"
          onClick={() => removeList(list.id)}
          title="Delete list"
        >
          ✕
        </button>
      </div>

      <ul className="space-y-1">
        <SortableContext
          items={list.items.map((it) => `item:${list.id}:${it.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {list.items.map((item) => (
            <ItemRow key={item.id} listId={list.id} item={item} nameOf={nameOf} />
          ))}
        </SortableContext>
      </ul>

      <button
        type="button"
        className="mt-2 text-xs text-sky-400 hover:text-sky-300"
        onClick={() => addItem(list.id)}
      >
        + Add item
      </button>
    </div>
  );
}

export function ListsPane(): React.ReactElement {
  const listOrder = useProjectStore((s) => s.project.listOrder);
  const lists = useProjectStore((s) => s.project.lists);
  const addList = useProjectStore((s) => s.addList);
  const { setNodeRef, isOver } = useDroppable({ id: 'zone:lists' });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lists</h2>
        <button
          type="button"
          className="rounded-md border border-stage-border px-2 py-1 text-xs text-sky-400 hover:bg-stage-border"
          onClick={() => addList()}
        >
          + New list
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-3 rounded-lg p-1 transition-colors ${
          isOver ? 'bg-sky-950/40 outline-dashed outline-1 outline-sky-700' : ''
        }`}
      >
        {listOrder.map((id) => {
          const list = lists[id];
          return list ? <ListCard key={id} list={list} /> : null;
        })}
        {listOrder.length === 0 && (
          <p className="p-3 text-xs italic text-gray-500">
            Drag a <span className="text-sky-400">List</span> here, or click “New list”.
          </p>
        )}
      </div>
    </div>
  );
}
