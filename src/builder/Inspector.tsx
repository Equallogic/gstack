import type { OutputBlock } from '@/model/types';
import { useProjectStore } from '@/store/useProjectStore';
import { PLUGIN_DEFS } from '@/catalog/components';

/** Find the plugin def whose importName matches (for arg labels). */
function pluginDefFor(importName: string) {
  return Object.values(PLUGIN_DEFS).find((d) => d.importName === importName);
}

/** Flatten a plugin arg's template value to plain text for editing. */
function argText(value: { kind: string; value?: string }[]): string {
  return value.map((v) => ('value' in v && typeof v.value === 'string' ? v.value : '')).join('');
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded border border-stage-border bg-black/30 px-2 py-1 text-xs text-gray-200 focus:border-sky-500 focus:outline-none';

export function Inspector(): React.ReactElement | null {
  const selection = useProjectStore((s) => s.selection);
  const blocks = useProjectStore((s) => s.project.output.blocks);
  const listOrder = useProjectStore((s) => s.project.listOrder);
  const lists = useProjectStore((s) => s.project.lists);
  const updateBlock = useProjectStore((s) => s.updateBlock);
  const setPluginArg = useProjectStore((s) => s.setPluginArg);
  const select = useProjectStore((s) => s.select);

  if (selection?.kind !== 'block') return null;
  const block = blocks.find((b) => b.id === selection.blockId);
  if (!block) return null;

  const outputDomIds = blocks
    .filter((b): b is Extract<OutputBlock, { kind: 'outputRef' }> => b.kind === 'outputRef')
    .map((b) => b.domId);

  const patch = (p: Partial<OutputBlock>): void => updateBlock(block.id, p);

  return (
    <div className="rounded-lg border border-sky-800/60 bg-stage-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-400">
          {block.kind}
        </h3>
        <button
          type="button"
          className="text-xs text-gray-500 hover:text-white"
          onClick={() => select(null)}
        >
          done
        </button>
      </div>

      <div className="space-y-2.5">
        {block.kind === 'outputRef' && (
          <>
            <Field label="Shows list">
              <select
                className={inputCls}
                value={block.listId}
                onChange={(e) => patch({ listId: e.target.value } as Partial<OutputBlock>)}
              >
                {listOrder.map((id) => (
                  <option key={id} value={id}>
                    {lists[id]?.name ?? id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="DOM id (for button targeting)">
              <input
                className={inputCls}
                value={block.domId}
                onChange={(e) => patch({ domId: e.target.value } as Partial<OutputBlock>)}
              />
            </Field>
          </>
        )}

        {block.kind === 'button' && (
          <>
            <Field label="Label">
              <input
                className={inputCls}
                value={block.label}
                onChange={(e) => patch({ label: e.target.value } as Partial<OutputBlock>)}
              />
            </Field>
            <Field label="Re-rolls (blank = all outputs)">
              <div className="space-y-1">
                {outputDomIds.length === 0 && (
                  <span className="text-[11px] italic text-gray-500">No outputs yet.</span>
                )}
                {outputDomIds.map((domId) => {
                  const targets =
                    block.action.type === 'update' ? block.action.targetDomIds : [];
                  const checked = targets.includes(domId);
                  return (
                    <label key={domId} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...targets, domId]
                            : targets.filter((t) => t !== domId);
                          patch({ action: { type: 'update', targetDomIds: next } } as Partial<OutputBlock>);
                        }}
                      />
                      #{domId}
                    </label>
                  );
                })}
              </div>
            </Field>
          </>
        )}

        {(block.kind === 'textInput' || block.kind === 'select' || block.kind === 'checkbox') && (
          <>
            <Field label="Label">
              <input
                className={inputCls}
                value={block.label ?? ''}
                onChange={(e) => patch({ label: e.target.value } as Partial<OutputBlock>)}
              />
            </Field>
            <Field label="Sets variable (use [name] in a list)">
              <input
                className={inputCls}
                value={block.bindVar}
                onChange={(e) => patch({ bindVar: e.target.value } as Partial<OutputBlock>)}
              />
            </Field>
          </>
        )}

        {block.kind === 'textInput' && (
          <Field label="Placeholder">
            <input
              className={inputCls}
              value={block.placeholder ?? ''}
              onChange={(e) => patch({ placeholder: e.target.value } as Partial<OutputBlock>)}
            />
          </Field>
        )}

        {block.kind === 'select' && (
          <Field label="Options (one per line, or pick a list below)">
            <textarea
              className={inputCls}
              rows={3}
              value={(block.options ?? []).join('\n')}
              onChange={(e) =>
                patch({
                  options: e.target.value.split('\n').filter((s) => s.trim() !== ''),
                  optionsListId: undefined,
                } as Partial<OutputBlock>)
              }
            />
          </Field>
        )}

        {block.kind === 'pluginBlock' && (
          <>
            <p className="text-[11px] leading-snug text-gray-500">
              Imports <span className="text-sky-400">{block.importName}</span>. Preview shows a
              placeholder; the real plugin runs on Perchance after export.
            </p>
            {(pluginDefFor(block.importName)?.argKeys ?? ['prompt']).map((key) => {
              const arg = block.args.find((a) => a.key === key);
              return (
                <Field key={key} label={key}>
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={arg ? argText(arg.value) : ''}
                    placeholder={key === 'prompt' ? 'Describe what to generate...' : ''}
                    onChange={(e) => setPluginArg(block.id, key, e.target.value)}
                  />
                </Field>
              );
            })}
          </>
        )}

        {block.kind === 'html' && (
          <Field label="Tag">
            <select
              className={inputCls}
              value={block.tag}
              onChange={(e) => patch({ tag: e.target.value as typeof block.tag } as Partial<OutputBlock>)}
            >
              {['p', 'div', 'span', 'h1', 'h2', 'h3', 'br'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </div>
  );
}
