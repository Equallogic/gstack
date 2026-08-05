import type {
  GeneratorProject,
  ListItem,
  ListNode,
  MethodCall,
  TemplateNode,
} from './types';
import { makeId } from './ids';

/** A single text template node. */
export function text(value: string): TemplateNode {
  return { kind: 'text', value };
}

/** A reference template node to a list by id. */
export function ref(listId: string, methods: MethodCall[] = []): TemplateNode {
  return { kind: 'ref', target: { listId }, methods };
}

export function makeItem(content: TemplateNode[] | string): ListItem {
  return {
    id: makeId('item'),
    content: typeof content === 'string' ? [text(content)] : content,
  };
}

export function makeList(name: string, items: (string | ListItem)[] = []): ListNode {
  return {
    id: makeId('list'),
    name,
    items: items.map((it) => (typeof it === 'string' ? makeItem(it) : it)),
  };
}

/** An empty project with a single starter list and an output block. */
export function makeStarterProject(): GeneratorProject {
  const animals = makeList('animal', ['cat', 'dog', 'narwhal']);
  const output = makeList('output', [
    { id: makeId('item'), content: [text('The '), ref(animals.id), text(' sat on the mat.')] },
  ]);
  return {
    schemaVersion: 1,
    meta: { id: makeId('proj'), name: 'Untitled generator' },
    lists: {
      [animals.id]: animals,
      [output.id]: output,
    },
    listOrder: [output.id, animals.id],
    variables: [],
    imports: [],
    output: {
      blocks: [
        {
          kind: 'outputRef',
          id: makeId('block'),
          listId: output.id,
          domId: 'out',
        },
        {
          kind: 'button',
          id: makeId('block'),
          label: 'Generate',
          action: { type: 'update', targetDomIds: ['out'] },
        },
      ],
    },
    seed: 1,
  };
}

/** A truly empty project (no lists) for building from scratch. */
export function makeEmptyProject(): GeneratorProject {
  return {
    schemaVersion: 1,
    meta: { id: makeId('proj'), name: 'Untitled generator' },
    lists: {},
    listOrder: [],
    variables: [],
    imports: [],
    output: { blocks: [] },
    seed: 1,
  };
}
