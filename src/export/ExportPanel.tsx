import { useMemo, useState } from 'react';
import type { GeneratorProject } from '@/model/types';
import { serialize } from '@/serializer';

interface ExportPanelProps {
  project: GeneratorProject;
  onClose(): void;
}

function CopyButton({ text }: { text: string }): React.ReactElement {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded-md border border-stage-border bg-stage-panel px-3 py-1 text-xs hover:bg-stage-border"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export function ExportPanel({ project, onClose }: ExportPanelProps): React.ReactElement {
  const { lists, html } = useMemo(() => serialize(project), [project]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-stage-border bg-stage-bg shadow-2xl">
        <header className="flex items-center justify-between border-b border-stage-border px-5 py-3">
          <h2 className="text-sm font-semibold">Export to Perchance</h2>
          <button
            type="button"
            className="text-xl leading-none text-gray-400 hover:text-white"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-300">
            <li>
              Open the{' '}
              <a
                className="text-sky-400 underline"
                href="https://perchance.org/editgen"
                target="_blank"
                rel="noreferrer"
              >
                Perchance editor
              </a>{' '}
              in a new tab.
            </li>
            <li>Paste the lists panel below into the left (code) editor.</li>
            <li>Paste the HTML panel into the HTML tab.</li>
            <li>Click save, then choose a URL to publish (a free account is needed to save).</li>
          </ol>

          <section>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Lists panel
              </h3>
              <CopyButton text={lists} />
            </div>
            <pre className="max-h-64 overflow-auto rounded-lg border border-stage-border bg-black/40 p-3 font-mono text-xs leading-relaxed text-gray-200">
              {lists}
            </pre>
          </section>

          <section>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                HTML panel
              </h3>
              <CopyButton text={html} />
            </div>
            <pre className="max-h-64 overflow-auto rounded-lg border border-stage-border bg-black/40 p-3 font-mono text-xs leading-relaxed text-gray-200">
              {html}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}
