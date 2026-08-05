import type { GeneratorProject } from '@/model/types';

/**
 * Hand-authored fixture: a weighted random name generator with a re-roll
 * button. This is the P1 "de-risk the round trip" anchor — it must both
 * preview correctly and serialize to Perchance source that runs when pasted
 * into perchance.org/editgen.
 */
export const simpleProject: GeneratorProject = {
  schemaVersion: 1,
  meta: { id: 'proj_1', name: 'Name generator' },
  lists: {
    output: {
      id: 'output',
      name: 'output',
      items: [
        {
          id: 'o1',
          content: [
            { kind: 'ref', target: { listId: 'firstName' }, methods: [] },
            { kind: 'text', value: ' ' },
            { kind: 'ref', target: { listId: 'lastName' }, methods: [] },
          ],
        },
      ],
    },
    firstName: {
      id: 'firstName',
      name: 'firstName',
      items: [
        { id: 'f1', content: [{ kind: 'text', value: 'Alice' }] },
        { id: 'f2', content: [{ kind: 'text', value: 'Bob' }] },
        { id: 'f3', content: [{ kind: 'text', value: 'Carol' }], weight: 2 },
      ],
    },
    lastName: {
      id: 'lastName',
      name: 'lastName',
      items: [
        { id: 'l1', content: [{ kind: 'text', value: 'Smith' }] },
        { id: 'l2', content: [{ kind: 'text', value: 'Nakamura' }] },
      ],
    },
  },
  listOrder: ['output', 'firstName', 'lastName'],
  variables: [],
  imports: [],
  output: {
    blocks: [
      {
        kind: 'html',
        id: 'b0',
        tag: 'div',
        content: [{ kind: 'ref', target: { listId: 'output' }, methods: [] }],
        attrs: { style: 'font-size: 1.5em' },
      },
      { kind: 'html', id: 'b1', tag: 'br', content: [] },
      {
        kind: 'outputRef',
        id: 'b2',
        listId: 'output',
        domId: 'out',
      },
      {
        kind: 'button',
        id: 'b3',
        label: 'Generate',
        action: { type: 'update', targetDomIds: ['out'] },
      },
    ],
  },
  seed: 42,
};
