import { describe, expect, it } from 'vitest';
import { validateProject } from '@/model/validate';
import type { GeneratorProject } from '@/model/types';

function base(): GeneratorProject {
  return {
    schemaVersion: 1,
    meta: { id: 'p', name: 't' },
    lists: {
      a: { id: 'a', name: 'colour', items: [{ id: 'i', content: [{ kind: 'text', value: 'red' }] }] },
    },
    listOrder: ['a'],
    variables: [],
    imports: [],
    output: {
      blocks: [{ kind: 'outputRef', id: 'b', listId: 'a', domId: 'out' }],
    },
  };
}

describe('validateProject', () => {
  it('passes a well-formed project (no errors)', () => {
    const warnings = validateProject(base());
    expect(warnings.filter((w) => w.level === 'error')).toHaveLength(0);
  });

  it('flags an empty list', () => {
    const p = base();
    p.lists.a.items = [];
    expect(validateProject(p).some((w) => w.message.includes('no items'))).toBe(true);
  });

  it('flags an output block pointing at a missing list', () => {
    const p = base();
    (p.output.blocks[0] as { listId: string }).listId = 'ghost';
    expect(validateProject(p).some((w) => w.level === 'error')).toBe(true);
  });

  it('flags an invalid slug', () => {
    const p = base();
    p.meta.slug = 'AB';
    expect(validateProject(p).some((w) => w.message.includes('invalid'))).toBe(true);
  });

  it('flags duplicate list names', () => {
    const p = base();
    p.lists.b = { id: 'b', name: 'colour', items: [{ id: 'x', content: [{ kind: 'text', value: 'blue' }] }] };
    p.listOrder.push('b');
    expect(validateProject(p).some((w) => w.message.includes('unique'))).toBe(true);
  });
});
