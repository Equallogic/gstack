import { describe, expect, it } from 'vitest';
import { makeContext, renderProject } from '@/engine';
import { evalTemplate } from '@/engine';
import type { GeneratorProject } from '@/model/types';
import { simpleProject } from '../fixtures/simple';

describe('engine — deterministic evaluation', () => {
  it('produces the same output for the same seed', () => {
    const a = renderProject(simpleProject, { seed: 7 });
    const b = renderProject(simpleProject, { seed: 7 });
    expect(a).toBe(b);
  });

  it('produces different output across seeds (not a constant)', () => {
    const outputs = new Set(
      Array.from({ length: 20 }, (_, i) => renderProject(simpleProject, { seed: i + 1 })),
    );
    expect(outputs.size).toBeGreaterThan(1);
  });

  it('resolves a reference to a real list item', () => {
    const ctx = makeContext(simpleProject, { seed: 1 });
    const out = evalTemplate(
      [{ kind: 'ref', target: { listId: 'firstName' }, methods: [] }],
      ctx,
    );
    expect(['Alice', 'Bob', 'Carol']).toContain(out);
  });

  it('honors weights: Carol (^2) appears more than its unweighted share', () => {
    let carol = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const ctx = makeContext(simpleProject, { seed: i + 1 });
      const out = evalTemplate(
        [{ kind: 'ref', target: { listId: 'firstName' }, methods: [] }],
        ctx,
      );
      if (out === 'Carol') carol += 1;
    }
    // Weights are 1:1:2, so Carol should be ~50% (well above the 33% uniform share).
    expect(carol / N).toBeGreaterThan(0.42);
    expect(carol / N).toBeLessThan(0.58);
  });

  it('applies titleCase transform', () => {
    const project: GeneratorProject = {
      schemaVersion: 1,
      meta: { id: 'p', name: 't' },
      lists: {
        word: {
          id: 'word',
          name: 'word',
          items: [{ id: 'w', content: [{ kind: 'text', value: 'hello world' }] }],
        },
      },
      listOrder: ['word'],
      variables: [],
      imports: [],
      output: { blocks: [] },
    };
    const ctx = makeContext(project, { seed: 1 });
    const out = evalTemplate(
      [{ kind: 'ref', target: { listId: 'word' }, methods: [{ name: 'titleCase' }] }],
      ctx,
    );
    expect(out).toBe('Hello World');
  });

  it('renders the full output template (outputRef + button)', () => {
    const html = renderProject(simpleProject, { seed: 3 });
    expect(html).toContain('<span id="out"');
    expect(html).toContain('data-perch-action="update"');
    expect(html).toContain('Generate');
  });
});
