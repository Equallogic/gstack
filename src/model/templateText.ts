import type { GeneratorProject, MethodCall, TemplateNode } from './types';

/**
 * A lightweight text <-> template codec for the item editor.
 *
 * The builder shows list items as editable text where `[listName]` is a
 * reference and `{a|b|c}` is an inline list. This keeps items editable as
 * plain strings without losing structured references. It is NOT a Perchance
 * parser (the serializer is the one true emitter); it only round-trips the
 * subset the text editor produces.
 */

export function templateToText(content: TemplateNode[], nameOf: (listId: string) => string): string {
  return content.map((n) => nodeToText(n, nameOf)).join('');
}

function nodeToText(n: TemplateNode, nameOf: (listId: string) => string): string {
  switch (n.kind) {
    case 'text':
      return n.value;
    case 'ref': {
      const base = n.target.listId ? nameOf(n.target.listId) : n.target.rawName ?? '';
      const path = n.target.path ? `.${n.target.path}` : '';
      const methods = n.methods.map((m) => `.${m.name}${m.args?.length ? `(${m.args.join(',')})` : ''}`).join('');
      return `[${base}${path}${methods}]`;
    }
    case 'inline':
      return `{${n.options.map((o) => templateToText(o, nameOf)).join('|')}}`;
    case 'var':
      return `[${n.name}]`;
    default:
      // assign / cond / expr / pluginCall are edited via structured UI, not text.
      return '';
  }
}

/** Parse editor text back into template nodes, resolving list names to ids. */
export function textToTemplate(text: string, project: GeneratorProject): TemplateNode[] {
  const idByName = new Map<string, string>();
  for (const [id, list] of Object.entries(project.lists)) idByName.set(list.name, id);

  const nodes: TemplateNode[] = [];
  let i = 0;
  let buf = '';
  const flush = (): void => {
    if (buf) {
      nodes.push({ kind: 'text', value: buf });
      buf = '';
    }
  };

  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\' && i + 1 < text.length) {
      buf += text[i + 1];
      i += 2;
      continue;
    }
    if (ch === '[') {
      const end = text.indexOf(']', i);
      if (end === -1) {
        buf += ch;
        i += 1;
        continue;
      }
      flush();
      nodes.push(parseRef(text.slice(i + 1, end), idByName));
      i = end + 1;
      continue;
    }
    if (ch === '{') {
      const end = text.indexOf('}', i);
      if (end === -1) {
        buf += ch;
        i += 1;
        continue;
      }
      flush();
      const options = text
        .slice(i + 1, end)
        .split('|')
        .map((opt) => textToTemplate(opt, project));
      nodes.push({ kind: 'inline', options });
      i = end + 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  flush();
  return nodes;
}

function parseRef(inner: string, idByName: Map<string, string>): TemplateNode {
  const segments = inner.split('.');
  const base = segments[0];
  const rest = segments.slice(1);

  // Method calls look like selectOne / titleCase / selectMany(3).
  const methods: MethodCall[] = [];
  const pathParts: string[] = [];
  for (const seg of rest) {
    const call = seg.match(/^([a-zA-Z]+)\(([^)]*)\)$/);
    if (call) {
      methods.push({
        name: call[1] as MethodCall['name'],
        args: call[2]
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
          .map((a) => (Number.isFinite(Number(a)) ? Number(a) : a)),
      });
    } else if (isMethodName(seg)) {
      methods.push({ name: seg as MethodCall['name'] });
    } else {
      pathParts.push(seg);
    }
  }

  const listId = idByName.get(base);
  if (listId) {
    return {
      kind: 'ref',
      target: { listId, ...(pathParts.length ? { path: pathParts.join('.') } : {}) },
      methods,
    };
  }
  // Unknown name: keep it as a raw-name reference so nothing is silently lost.
  return {
    kind: 'ref',
    target: { rawName: base, ...(pathParts.length ? { path: pathParts.join('.') } : {}) },
    methods,
  };
}

const METHOD_NAMES = new Set([
  'selectOne', 'selectMany', 'selectUnique', 'selectAll', 'consumableList', 'evaluateItem',
  'titleCase', 'sentenceCase', 'upperCase', 'lowerCase', 'pluralForm', 'singularForm',
  'pastTense', 'presentTense', 'futureTense', 'getName', 'getChildNames', 'getOdds',
  'getLength', 'joinItems',
]);

function isMethodName(s: string): boolean {
  return METHOD_NAMES.has(s);
}
