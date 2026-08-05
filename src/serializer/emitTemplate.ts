import type {
  ExprNode,
  MethodCall,
  RefTarget,
  TemplateNode,
} from '@/model/types';
import type { SerializeContext } from './context';

/** Escape characters that Perchance would otherwise interpret. */
function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\{/g, '\\{');
}

/** Serialize a template (list-item content or output text) to Perchance source. */
export function emitTemplate(nodes: TemplateNode[], ctx: SerializeContext): string {
  return nodes.map((n) => emitNode(n, ctx)).join('');
}

function emitNode(node: TemplateNode, ctx: SerializeContext): string {
  switch (node.kind) {
    case 'text':
      return escapeText(node.value);
    case 'ref':
      return `[${emitRefInner(node.target, node.methods, ctx)}]`;
    case 'inline':
      return emitInline(node, ctx);
    case 'var':
      return `[${node.name}${emitMethods(node.methods)}]`;
    case 'assign':
      return `[${node.name} = ${emitExpr(node.expr, ctx)}${node.silent ? ', ""' : ''}]`;
    case 'cond':
      return `[${emitExpr(node.test, ctx)} ? "${escapeQuoted(emitTemplate(node.then, ctx))}" : "${escapeQuoted(emitTemplate(node.else, ctx))}"]`;
    case 'expr':
      return `[${emitExpr(node.expr, ctx)}]`;
    case 'pluginCall': {
      const args = emitPluginArgs(node.args, ctx);
      return `[${node.importName}(${args})${emitMethods(node.methods)}]`;
    }
    default: {
      const _exhaustive: never = node;
      return String(_exhaustive);
    }
  }
}

/** The inside of a [...] reference: name/path + method chain. */
function emitRefInner(target: RefTarget, methods: MethodCall[], ctx: SerializeContext): string {
  return emitTargetPath(target, ctx) + emitMethods(methods);
}

function emitTargetPath(target: RefTarget, ctx: SerializeContext): string {
  let base: string;
  if (target.listId) base = ctx.nameOf(target.listId);
  else if (target.rawName) base = target.rawName;
  else base = '';
  return target.path ? `${base}.${target.path}` : base;
}

function emitMethods(methods: MethodCall[]): string {
  return methods
    .map((m) => {
      const args = (m.args ?? [])
        .map((a) => (typeof a === 'string' ? `"${a}"` : String(a)))
        .join(', ');
      // selectMany/selectUnique always require parens; others are bare unless they have args.
      const needsParens =
        m.name === 'selectMany' || m.name === 'selectUnique' || args.length > 0;
      return needsParens ? `.${m.name}(${args})` : `.${m.name}`;
    })
    .join('');
}

function emitInline(node: Extract<TemplateNode, { kind: 'inline' }>, ctx: SerializeContext): string {
  const parts = node.options.map((opt, i) => {
    const body = emitTemplate(opt, ctx);
    const w = node.weights?.[i];
    return w != null && w !== 1 ? `${body} ^${w}` : body;
  });
  return `{${parts.join('|')}}`;
}

function escapeQuoted(s: string): string {
  return s.replace(/"/g, '\\"');
}

// ─── Expressions ──────────────────────────────────────────────────────────

export function emitExpr(expr: ExprNode, ctx: SerializeContext): string {
  switch (expr.t) {
    case 'lit':
      if (typeof expr.value === 'string') return `"${escapeQuoted(expr.value)}"`;
      return String(expr.value);
    case 'varRef':
      return expr.name;
    case 'listRef':
      return emitRefInner(expr.target, expr.methods, ctx);
    case 'binary':
      return `${emitExpr(expr.l, ctx)} ${expr.op} ${emitExpr(expr.r, ctx)}`;
    case 'unary':
      return `${expr.op}${emitExpr(expr.operand, ctx)}`;
    case 'ternary':
      return `${emitExpr(expr.test, ctx)} ? ${emitExpr(expr.then, ctx)} : ${emitExpr(expr.else, ctx)}`;
    case 'string':
      return `"${escapeQuoted(emitTemplate(expr.parts, ctx))}"`;
    case 'rawExpr':
      return expr.source;
    default: {
      const _exhaustive: never = expr;
      return String(_exhaustive);
    }
  }
}

function emitPluginArgs(
  args: import('@/model/types').PluginArg[],
  ctx: SerializeContext,
): string {
  if (args.length === 0) return '';
  const inner = args.map((a) => `${a.key}: '${emitTemplate(a.value, ctx).replace(/'/g, "\\'")}'`).join(', ');
  return `{${inner}}`;
}
