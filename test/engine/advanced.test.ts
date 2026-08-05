import { describe, expect, it } from 'vitest';
import { makeContext, evalTemplate } from '@/engine';
import { serialize } from '@/serializer';
import type { GeneratorProject } from '@/model/types';

/** Object-list: a person with name/age properties and a $output template. */
const people: GeneratorProject = {
  schemaVersion: 1,
  meta: { id: 'p', name: 't' },
  lists: {
    person: {
      id: 'person',
      name: 'person',
      outputConfig: {
        template: [
          { kind: 'text', value: 'My name is ' },
          { kind: 'ref', target: { rawName: 'this', path: 'name' }, methods: [] },
          { kind: 'text', value: ' and I am ' },
          { kind: 'ref', target: { rawName: 'this', path: 'age' }, methods: [] },
          { kind: 'text', value: '.' },
        ],
      },
      items: [
        {
          id: 'p1',
          content: [{ kind: 'text', value: 'Alice' }],
          properties: {
            name: [{ kind: 'text', value: 'Alice' }],
            age: [{ kind: 'text', value: '30' }],
          },
        },
      ],
    },
  },
  listOrder: ['person'],
  variables: [],
  imports: [],
  output: { blocks: [] },
};

describe('engine — object-lists with $output', () => {
  it('renders an item through the list $output template using this.*', () => {
    const ctx = makeContext(people, { seed: 1 });
    const out = evalTemplate(
      [{ kind: 'ref', target: { listId: 'person' }, methods: [] }],
      ctx,
    );
    expect(out).toBe('My name is Alice and I am 30.');
  });
});

describe('serializer — object-lists with $output', () => {
  it('emits $output and indented item properties', () => {
    const { lists } = serialize(people);
    expect(lists).toBe(
      'person\n' +
        '  $output = My name is [this.name] and I am [this.age].\n' +
        '  Alice\n' +
        '    name = Alice\n' +
        '    age = 30\n',
    );
  });
});

describe('engine — conditionals', () => {
  const project: GeneratorProject = {
    schemaVersion: 1,
    meta: { id: 'p', name: 't' },
    lists: {},
    listOrder: [],
    variables: [],
    imports: [],
    output: { blocks: [] },
  };

  it('evaluates a ternary against a variable', () => {
    const cond = {
      kind: 'cond' as const,
      test: {
        t: 'binary' as const,
        op: '>=' as const,
        l: { t: 'varRef' as const, name: 'age' },
        r: { t: 'lit' as const, value: 18 },
      },
      then: [{ kind: 'text' as const, value: 'adult' }],
      else: [{ kind: 'text' as const, value: 'minor' }],
    };
    expect(evalTemplate([cond], makeContext(project, { scope: { age: '20' } }))).toBe('adult');
    expect(evalTemplate([cond], makeContext(project, { scope: { age: '12' } }))).toBe('minor');
  });
});

describe('serializer — raw expression escape hatch', () => {
  it('emits a rawExpr verbatim inside brackets', () => {
    const project: GeneratorProject = {
      schemaVersion: 1,
      meta: { id: 'p', name: 't' },
      lists: {
        output: {
          id: 'output',
          name: 'output',
          items: [
            {
              id: 'o',
              content: [
                { kind: 'expr', expr: { t: 'rawExpr', source: 'Math.floor(Math.random()*6)+1' } },
              ],
            },
          ],
        },
      },
      listOrder: ['output'],
      variables: [],
      imports: [],
      output: { blocks: [] },
    };
    const { lists } = serialize(project);
    expect(lists).toContain('[Math.floor(Math.random()*6)+1]');
  });
});
