import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { OutputBlock } from '@/model/types';
import { useProjectStore } from '@/store/useProjectStore';

function blockSummary(block: OutputBlock, nameOf: (id: string) => string): string {
  switch (block.kind) {
    case 'html':
      return block.tag === 'br' ? '<br>' : `${block.tag}: "${block.content.map((c) => (c.kind === 'text' ? c.value : '…')).join('')}"`;
    case 'outputRef':
      return `output: [${nameOf(block.listId)}] → #${block.domId}`;
    case 'button':
      return `button: "${block.label}"`;
    case 'textInput':
      return `input → ${block.bindVar}`;
    case 'select':
      return `dropdown → ${block.bindVar}`;
    case 'checkbox':
      return `checkbox → ${block.bindVar}`;
    case 'pluginBlock':
      return `plugin: ${block.importName}`;
  }
}

function BlockRow({
  block,
  nameOf,
}: {
  block: OutputBlock;
  nameOf: (id: string) => string;
}): React.ReactElement {
  const removeBlock = useProjectStore((s) => s.removeBlock);
  const select = useProjectStore((s) => s.select);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `block:${block.id}`,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 rounded-md border border-stage-border bg-stage-panel px-2 py-2 font-mono text-xs text-gray-300 ${
        isDragging ? 'opacity-60' : ''
      }`}
    >
      <span
        className="cursor-grab select-none text-gray-600 hover:text-gray-300"
        title="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⠿
      </span>
      <button
        type="button"
        className="flex-1 text-left hover:text-sky-300"
        onClick={() => select({ kind: 'block', blockId: block.id })}
      >
        {blockSummary(block, nameOf)}
      </button>
      <button
        type="button"
        className="text-gray-600 hover:text-red-400"
        onClick={() => removeBlock(block.id)}
      >
        ✕
      </button>
    </li>
  );
}

export function OutputPane(): React.ReactElement {
  const blocks = useProjectStore((s) => s.project.output.blocks);
  const lists = useProjectStore((s) => s.project.lists);
  const nameOf = (id: string): string => lists[id]?.name ?? id;
  const { setNodeRef, isOver } = useDroppable({ id: 'zone:output' });

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Output UI</h2>
      <div
        ref={setNodeRef}
        className={`space-y-1.5 rounded-lg p-1 transition-colors ${
          isOver ? 'bg-sky-950/40 outline-dashed outline-1 outline-sky-700' : ''
        }`}
      >
        <SortableContext
          items={blocks.map((b) => `block:${b.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map((block) => (
            <BlockRow key={block.id} block={block} nameOf={nameOf} />
          ))}
        </SortableContext>
        {blocks.length === 0 && (
          <p className="p-3 text-xs italic text-gray-500">
            Drag an <span className="text-sky-400">Output</span> or{' '}
            <span className="text-sky-400">Button</span> here.
          </p>
        )}
      </div>
    </div>
  );
}
