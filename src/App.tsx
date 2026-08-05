import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { ListsPane } from '@/builder/ListsPane';
import { OutputPane } from '@/builder/OutputPane';
import { PreviewFrame } from '@/preview/PreviewFrame';
import { ExportPanel } from '@/export/ExportPanel';

export default function App(): React.ReactElement {
  const project = useProjectStore((s) => s.project);
  const previewSeed = useProjectStore((s) => s.previewSeed);
  const projectName = useProjectStore((s) => s.project.meta.name);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const reroll = useProjectStore((s) => s.reroll);
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-stage-border px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-bold text-sky-400">Perchance Builder</span>
          <input
            className="rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm text-gray-200 hover:border-stage-border focus:border-sky-500 focus:outline-none"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            aria-label="Generator name"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-stage-border px-3 py-1 text-xs text-gray-300 hover:bg-stage-panel"
            onClick={reroll}
          >
            ↻ Re-roll preview
          </button>
          <button
            type="button"
            className="rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-500"
            onClick={() => setShowExport(true)}
          >
            Export to Perchance
          </button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[1fr_1fr] gap-3 p-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="min-h-0 space-y-5 overflow-y-auto rounded-lg border border-stage-border bg-stage-bg p-4">
          <ListsPane />
          <div className="border-t border-stage-border pt-4">
            <OutputPane />
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-lg border border-stage-border bg-stage-bg p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Live preview
            </h2>
            <span className="text-[10px] text-gray-600">sandboxed · seed {previewSeed}</span>
          </div>
          <div className="min-h-0 flex-1">
            <PreviewFrame project={project} seed={previewSeed} />
          </div>
        </section>
      </main>

      {showExport && <ExportPanel project={project} onClose={() => setShowExport(false)} />}
    </div>
  );
}
