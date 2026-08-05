import { describe, expect, it } from 'vitest';
import { makeContext, evalTemplate } from '@/engine';
import type { GeneratorProject, TemplateNode } from '@/model/types';

function projectWith(lists: GeneratorProject['lists']): GeneratorProject {
  return {
    schemaVersion: 1,
    meta: { id: 'p', name: 't' },
    lists,
    listOrder: Object.keys(lists),
    variables: [],
    imports: [],
    output: { blocks: [] },
  };
}

const colors: GeneratorProject = projectWith({
  color: {
    id: 'color',
    name: 'color',
    items: [
      { id: 'c1', content: [{ kind: 'text', value: 'red' }] },
      { id: 'c2', content: [{ kind: 'text', value: 'green' }] },
      { id: 'c3', content: [{ kind: 'text', value: 'blue' }] },
    ],
  },
});

function render(nodes: TemplateNode[], seed: number): string {
  return evalTemplate(nodes, makeContext(colors, { seed }));
}

describe('engine — selection methods', () => {
  it('selectMany(2) returns two comma-joined picks', () => {
    const out = render(
      [{ kind: 'ref', target: { listId: 'color' }, methods: [{ name: 'selectMany', args: [2] }] }],
      5,
    );
    expect(out.split(', ')).toHaveLength(2);
  });

  it('selectUnique(3) returns all three distinct colors', () => {
    const out = render(
      [{ kind: 'ref', target: { listId: 'color' }, methods: [{ name: 'selectUnique', args: [3] }] }],
      9,
    );
    const parts = out.split(', ').sort();
    expect(parts).toEqual(['blue', 'green', 'red']);
  });

  it('joinItems overrides the default separator', () => {
    const out = render(
      [
        {
          kind: 'ref',
          target: { listId: 'color' },
          methods: [{ name: 'selectUnique', args: [3] }, { name: 'joinItems', args: [' / '] }],
        },
      ],
      9,
    );
    expect(out.split(' / ')).toHaveLength(3);
  });

  it('upperCase transforms the selected item', () => {
    const out = render(
      [{ kind: 'ref', target: { listId: 'color' }, methods: [{ name: 'upperCase' }] }],
      1,
    );
    expect(out).toMatch(/^(RED|GREEN|BLUE)$/);
  });
});

describe('engine — inline lists', () => {
  it('picks one of the inline options', () => {
    const out = render(
      [
        {
          kind: 'inline',
          options: [[{ kind: 'text', value: 'yes' }], [{ kind: 'text', value: 'no' }]],
        },
      ],
      3,
    );
    expect(['yes', 'no']).toContain(out);
  });

  it('respects inline weights (heavy option dominates)', () => {
    let heavy = 0;
    for (let i = 0; i < 500; i++) {
      const out = render(
        [
          {
            kind: 'inline',
            options: [[{ kind: 'text', value: 'A' }], [{ kind: 'text', value: 'B' }]],
            weights: [9, 1],
          },
        ],
        i + 1,
      );
      if (out === 'A') heavy += 1;
    }
    expect(heavy / 500).toBeGreaterThan(0.8);
  });
});
