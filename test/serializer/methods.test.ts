import { describe, expect, it } from 'vitest';
import { serialize } from '@/serializer';
import type { GeneratorProject } from '@/model/types';

const project: GeneratorProject = {
  schemaVersion: 1,
  meta: { id: 'p', name: 't' },
  lists: {
    color: {
      id: 'color',
      name: 'color',
      items: [
        { id: 'c1', content: [{ kind: 'text', value: 'red' }] },
        { id: 'c2', content: [{ kind: 'text', value: 'blue' }] },
      ],
    },
    output: {
      id: 'output',
      name: 'output',
      items: [
        {
          id: 'o1',
          content: [
            {
              kind: 'ref',
              target: { listId: 'color' },
              methods: [{ name: 'selectMany', args: [2] }, { name: 'joinItems', args: [' and '] }],
            },
            { kind: 'text', value: ' — ' },
            {
              kind: 'inline',
              options: [[{ kind: 'text', value: 'hot' }], [{ kind: 'text', value: 'cold' }]],
              weights: [3, null],
            },
          ],
        },
      ],
    },
  },
  listOrder: ['output', 'color'],
  variables: [],
  imports: [],
  output: { blocks: [] },
};

describe('serializer — methods, inline lists, weights', () => {
  it('emits method chains and weighted inline lists correctly', () => {
    const { lists } = serialize(project);
    expect(lists).toBe(
      'output\n' +
        '  [color.selectMany(2).joinItems(" and ")] — {hot ^3|cold}\n' +
        '\n' +
        'color\n' +
        '  red\n' +
        '  blue\n',
    );
  });
});
