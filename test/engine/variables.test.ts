import { describe, expect, it } from 'vitest';
import { makeContext, evalTemplate, renderProject } from '@/engine';
import type { GeneratorProject } from '@/model/types';

/** Output greets a variable `name` that an input would set. */
const project: GeneratorProject = {
  schemaVersion: 1,
  meta: { id: 'p', name: 'greeter' },
  lists: {
    output: {
      id: 'output',
      name: 'output',
      items: [
        {
          id: 'o1',
          content: [
            { kind: 'text', value: 'Hello, ' },
            { kind: 'ref', target: { rawName: 'name' }, methods: [] },
            { kind: 'text', value: '!' },
          ],
        },
      ],
    },
  },
  listOrder: ['output'],
  variables: [],
  imports: [],
  output: {
    blocks: [
      { kind: 'textInput', id: 'i1', bindVar: 'name', label: 'Name' },
      { kind: 'outputRef', id: 'b1', listId: 'output', domId: 'out' },
    ],
  },
};

describe('engine — variables driven by inputs', () => {
  it('resolves a bare [name] from scope when it is not a list', () => {
    const ctx = makeContext(project, { seed: 1, scope: { name: 'Ada' } });
    const out = evalTemplate(project.lists.output.items[0].content, ctx);
    expect(out).toBe('Hello, Ada!');
  });

  it('applies a method chain to a variable value', () => {
    const ctx = makeContext(project, { seed: 1, scope: { name: 'ada' } });
    const out = evalTemplate(
      [{ kind: 'var', name: 'name', methods: [{ name: 'titleCase' }] }],
      ctx,
    );
    expect(out).toBe('Ada');
  });

  it('shows an unresolved placeholder when the variable is unset', () => {
    const html = renderProject(project, { seed: 1 });
    expect(html).toContain('⟨?name⟩');
  });

  it('reflects the input value in the rendered output span', () => {
    const html = renderProject(project, { seed: 1, scope: { name: 'Grace' } });
    expect(html).toContain('Hello, Grace!');
    expect(html).toContain('data-perch-bind="name"');
  });
});
