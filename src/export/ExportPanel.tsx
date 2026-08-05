import { useMemo, useState } from 'react';
import type { GeneratorProject } from '@/model/types';
import { serialize } from '@/serializer';
import { validateProject, type Warning } from '@/model/validate';
import { useProjectStore } from '@/store/useProjectStore';

interface ExportPanelProps {
  project: GeneratorProject;
  onClose(): void;
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }): React.ReactElement {
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
      {copied ? 'Copied!' : label}
    </button>
  );
}

function download(filename: string, content: string, type = 'text/plain'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const WARN_STYLES: Record<Warning['level'], string> = {
  error: 'border-red-800/60 bg-red-950/40 text-red-300',
  warn: 'border-amber-800/60 bg-amber-950/30 text-amber-300',
  info: 'border-sky-800/60 bg-sky-950/30 text-sky-300',
};

export function ExportPanel({ project, onClose }: ExportPanelProps): React.ReactElement {
  const setSlug = useProjectStore((s) => s.setSlug);
  const { lists, html } = useMemo(() => serialize(project), [project]);
  const warnings = useMemo(() => validateProject(project), [project]);
  const combined = `=== LISTS PANEL ===\n${lists}\n=== HTML PANEL ===\n${html}\n`;
  const slugName = project.meta.slug || 'generator';

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
          {warnings.length > 0 && (
            <ul className="space-y-1">
              {warnings.map((w, i) => (
                <li key={i} className={`rounded-md border px-3 py-1.5 text-xs ${WARN_STYLES[w.level]}`}>
                  {w.level === 'error' ? '⚠ ' : ''}
                  {w.message}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-end gap-3">
            <label className="flex-1">
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Desired URL (optional)
              </span>
              <div className="flex items-center rounded border border-stage-border bg-black/30 px-2 text-xs text-gray-400">
                <span>perchance.org/</span>
                <input
                  className="flex-1 bg-transparent py-1 text-gray-200 focus:outline-none"
                  value={project.meta.slug ?? ''}
                  placeholder="my-generator"
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
            </label>
            <CopyButton text={combined} label="Copy both" />
            <button
              type="button"
              className="rounded-md border border-stage-border bg-stage-panel px-3 py-1 text-xs hover:bg-stage-border"
              onClick={() => download(`${slugName}.perchance.txt`, combined)}
            >
              Download .txt
            </button>
            <button
              type="button"
              className="rounded-md border border-stage-border bg-stage-panel px-3 py-1 text-xs hover:bg-stage-border"
              onClick={() => download(`${slugName}.json`, JSON.stringify(project, null, 2), 'application/json')}
            >
              Save project
            </button>
          </div>

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
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lists panel</h3>
              <CopyButton text={lists} />
            </div>
            <pre className="max-h-64 overflow-auto rounded-lg border border-stage-border bg-black/40 p-3 font-mono text-xs leading-relaxed text-gray-200">
              {lists}
            </pre>
          </section>

          <section>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">HTML panel</h3>
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
