import { useEffect, useRef } from 'react';
import type { GeneratorProject } from '@/model/types';
import { makeContext, renderOutputHtml, renderOutputRefInner } from '@/engine';
import { randomSeed } from '@/lib/rng';

interface PreviewFrameProps {
  project: GeneratorProject;
  seed: number;
}

type InboundMessage =
  | { type: 'ready' }
  | { type: 'action'; action: 'update'; targets: string[] }
  | { type: 'input'; bindVar: string; value: string };

/**
 * Hosts the sandboxed preview iframe and owns the engine + interactive state.
 *
 * Security: the iframe uses sandbox="allow-scripts" WITHOUT allow-same-origin,
 * so generator-supplied HTML/JS runs in an opaque origin that cannot reach our
 * app. We authenticate inbound messages by comparing event.source to the
 * iframe's contentWindow (the opaque origin reports event.origin === "null",
 * so an origin string check would be meaningless here).
 */
export function PreviewFrame({ project, seed }: PreviewFrameProps): React.ReactElement {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  // Live interactive state, kept out of React render to avoid focus loss.
  const scopeRef = useRef<Record<string, string>>({});
  const seedRef = useRef(seed);
  const projectRef = useRef(project);

  projectRef.current = project;
  seedRef.current = seed;

  const post = (msg: unknown): void => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*');
  };

  const renderFull = (): void => {
    const ctx = makeContext(projectRef.current, {
      seed: seedRef.current,
      scope: scopeRef.current,
    });
    post({ type: 'render', html: renderOutputHtml(projectRef.current, ctx) });
  };

  // Re-render whenever the project or seed changes (and the frame is ready).
  useEffect(() => {
    if (readyRef.current) renderFull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, seed]);

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const msg = event.data as InboundMessage;
      if (!msg || typeof msg !== 'object') return;

      switch (msg.type) {
        case 'ready':
          readyRef.current = true;
          renderFull();
          break;
        case 'action': {
          // A re-roll: fresh seed, then patch the targeted output spans (or all).
          seedRef.current = randomSeed();
          const ctx = makeContext(projectRef.current, {
            seed: seedRef.current,
            scope: scopeRef.current,
          });
          const targets =
            msg.targets.length > 0
              ? projectRef.current.output.blocks.filter(
                  (b) => b.kind === 'outputRef' && msg.targets.includes(b.domId),
                )
              : projectRef.current.output.blocks.filter((b) => b.kind === 'outputRef');
          const updates: Record<string, string> = {};
          for (const b of targets) {
            if (b.kind === 'outputRef') {
              updates[b.domId] = renderOutputRefInner(b.listId, ctx);
            }
          }
          if (Object.keys(updates).length > 0) post({ type: 'patch', updates });
          else renderFull();
          break;
        }
        case 'input':
          scopeRef.current = { ...scopeRef.current, [msg.bindVar]: msg.value };
          renderFull();
          break;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title="Live preview"
      src="/preview-frame.html"
      sandbox="allow-scripts"
      className="h-full w-full rounded-lg border border-stage-border bg-white"
    />
  );
}
