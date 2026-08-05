import type { OutputBlock } from '@/model/types';
import { useProjectStore } from '@/store/useProjectStore';
import { makeId } from '@/model/ids';

function blockSummary(block: OutputBlock, nameOf: (id: string) => string): string {
  switch (block.kind) {
    case 'html':
      return `<${block.tag}>`;
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

export function OutputPane(): React.ReactElement {
  const blocks = useProjectStore((s) => s.project.output.blocks);
  const lists = useProjectStore((s) => s.project.lists);
  const listOrder = useProjectStore((s) => s.project.listOrder);
  const addBlock = useProjectStore((s) => s.addBlock);
  const removeBlock = useProjectStore((s) => s.removeBlock);
  const nameOf = (id: string): string => lists[id]?.name ?? id;

  const addOutputRef = (): void => {
    const firstList = listOrder[0];
    if (!firstList) return;
    const n = blocks.filter((b) => b.kind === 'outputRef').length + 1;
    addBlock({
      kind: 'outputRef',
      id: makeId('block'),
      listId: firstList,
      domId: `out${n === 1 ? '' : n}`,
    });
  };

  const addButton = (): void => {
    const targets = blocks
      .filter((b): b is Extract<OutputBlock, { kind: 'outputRef' }> => b.kind === 'outputRef')
      .map((b) => b.domId);
    addBlock({
      kind: 'button',
      id: makeId('block'),
      label: 'Generate',
      action: { type: 'update', targetDomIds: targets },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Output UI</h2>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded-md border border-stage-border px-2 py-1 text-xs text-sky-400 hover:bg-stage-border"
            onClick={addOutputRef}
          >
            + Output
          </button>
          <button
            type="button"
            className="rounded-md border border-stage-border px-2 py-1 text-xs text-sky-400 hover:bg-stage-border"
            onClick={addButton}
          >
            + Button
          </button>
        </div>
      </div>

      <ul className="space-y-1.5">
        {blocks.map((block) => (
          <li
            key={block.id}
            className="flex items-center justify-between rounded-md border border-stage-border bg-stage-panel px-3 py-2 font-mono text-xs text-gray-300"
          >
            <span>{blockSummary(block, nameOf)}</span>
            <button
              type="button"
              className="text-gray-600 hover:text-red-400"
              onClick={() => removeBlock(block.id)}
            >
              ✕
            </button>
          </li>
        ))}
        {blocks.length === 0 && (
          <li className="text-xs italic text-gray-500">
            No output blocks. Add an Output to show a list result.
          </li>
        )}
      </ul>
    </div>
  );
}
