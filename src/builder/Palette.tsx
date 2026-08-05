import { useDraggable } from '@dnd-kit/core';
import { PALETTE, type PaletteItem } from '@/catalog/components';

function PaletteChip({ item }: { item: PaletteItem }): React.ReactElement {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${item.key}`,
    data: { source: 'palette', key: item.key, zone: item.zone },
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`flex w-full items-center gap-2 rounded-md border border-stage-border bg-stage-panel px-2.5 py-2 text-left text-xs hover:border-sky-600 ${
        isDragging ? 'opacity-40' : ''
      }`}
      title={item.hint}
      {...listeners}
      {...attributes}
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-black/40 font-mono text-sky-400">
        {item.icon}
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-gray-200">{item.label}</span>
        <span className="block text-[10px] leading-tight text-gray-500">{item.hint}</span>
      </span>
    </button>
  );
}

export function Palette(): React.ReactElement {
  const dataItems = PALETTE.filter((p) => p.zone === 'lists');
  const outputItems = PALETTE.filter((p) => p.zone === 'output');
  return (
    <div className="space-y-4">
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Components
        </h2>
        <p className="mb-3 text-[11px] leading-snug text-gray-500">
          Drag onto the canvas, or click a canvas button. Items and blocks reorder by dragging.
        </p>
      </div>
      <div>
        <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
          Data
        </h3>
        <div className="space-y-1.5">
          {dataItems.map((item) => (
            <PaletteChip key={item.key} item={item} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
          Output UI
        </h3>
        <div className="space-y-1.5">
          {outputItems.map((item) => (
            <PaletteChip key={item.key} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
