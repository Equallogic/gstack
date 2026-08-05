import { describe, expect, it } from 'vitest';
import { serialize } from '@/serializer';
import type { GeneratorProject } from '@/model/types';

const project: GeneratorProject = {
  schemaVersion: 1,
  meta: { id: 'p', name: 'portrait' },
  lists: {
    subject: {
      id: 'subject',
      name: 'subject',
      items: [
        { id: 's1', content: [{ kind: 'text', value: 'a red fox' }] },
        { id: 's2', content: [{ kind: 'text', value: 'a snowy owl' }] },
      ],
    },
  },
  listOrder: ['subject'],
  variables: [],
  imports: [{ id: 'i1', importName: 'image', plugin: 'text-to-image-plugin' }],
  output: {
    blocks: [
      {
        kind: 'pluginBlock',
        id: 'pb1',
        importName: 'image',
        args: [
          {
            key: 'prompt',
            value: [{ kind: 'ref', target: { listId: 'subject' }, methods: [] }],
          },
        ],
      },
    ],
  },
};

describe('serializer — plugins (text-to-image)', () => {
  const { lists, html } = serialize(project);

  it('emits the plugin import at the top of the lists panel', () => {
    expect(lists).toBe(
      'image = {import:text-to-image-plugin}\n' +
        '\n' +
        'subject\n' +
        '  a red fox\n' +
        '  a snowy owl\n',
    );
  });

  it('emits the plugin call in the HTML panel with a templated prompt', () => {
    expect(html).toBe("[image({prompt: '[subject]'})]");
  });
});
