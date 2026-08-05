import type {
  ExprNode,
  ListItem,
  ListNode,
  MethodCall,
  MethodName,
  PluginArg,
  RefTarget,
  TemplateNode,
} from '@/model/types';
import type { EvalContext } from './context';
import { guardDepth, releaseDepth } from './context';
import { resolveList, targetLabel } from './resolve';
import { TRANSFORMS } from './transforms';

const SELECTION_METHODS = new Set<MethodName>([
  'selectOne',
  'selectMany',
  'selectUnique',
  'selectAll',
  'consumableList',
  'evaluateItem',
]);

const INTROSPECTION_METHODS = new Set<MethodName>([
  'getName',
  'getChildNames',
  'getOdds',
  'getLength',
]);

/** Evaluate a sequence of template nodes to a single string. */
export function evalTemplate(nodes: TemplateNode[], ctx: EvalContext): string {
  let out = '';
  for (const node of nodes) out += evalNode(node, ctx);
  return out;
}

function evalNode(node: TemplateNode, ctx: EvalContext): string {
  switch (node.kind) {
    case 'text':
      return node.value;
    case 'ref':
      return evalRef(node.target, node.methods, ctx);
    case 'inline':
      return evalInline(node, ctx);
    case 'var': {
      const base = ctx.scope.get(node.name) ?? '';
      return applyStringMethods(base, node.methods);
    }
    case 'assign': {
      const value = stringifyExprResult(evalExpr(node.expr, ctx));
      ctx.scope.set(node.name, value);
      return node.silent ? '' : value;
    }
    case 'cond': {
      const test = truthy(evalExpr(node.test, ctx));
      return evalTemplate(test ? node.then : node.else, ctx);
    }
    case 'expr':
      return stringifyExprResult(evalExpr(node.expr, ctx));
    case 'pluginCall':
      return evalPluginShim(node.importName, node.args, ctx);
    default: {
      const _exhaustive: never = node;
      return String(_exhaustive);
    }
  }
}

// ─── References + method chains ────────────────────────────────────────────

function evalRef(target: RefTarget, methods: MethodCall[], ctx: EvalContext): string {
  // [this.prop] resolves against the object-list item currently rendering.
  if (target.rawName === 'this' && target.path) {
    return applyStringMethods(ctx.thisScope?.[target.path] ?? '', methods);
  }

  const node = resolveList(target, ctx);
  if (!node) {
    // A bare name that isn't a list may be a variable (e.g. [name] fed by an
    // input). Fall back to variable scope before giving up. This mirrors
    // Perchance, where [x] resolves a list OR a variable.
    const varName = target.rawName;
    if (varName && !target.path && ctx.scope.has(varName)) {
      return applyStringMethods(ctx.scope.get(varName) ?? '', methods);
    }
    // Unresolved reference: surface it visibly rather than silently dropping.
    return `⟨?${targetLabel(target)}⟩`;
  }

  const first = methods[0];
  // Introspection methods act on the list node directly.
  if (first && INTROSPECTION_METHODS.has(first.name)) {
    return applyIntrospection(node, first);
  }

  let value: string | string[];
  let idx = 0;
  if (first && SELECTION_METHODS.has(first.name)) {
    value = applySelection(node, first, ctx);
    idx = 1;
  } else {
    // Implicit selectOne when no selection method leads the chain.
    value = selectOne(node, ctx);
  }

  for (; idx < methods.length; idx++) {
    value = applyChainMethod(value, methods[idx]);
  }
  return Array.isArray(value) ? value.join(', ') : value;
}

function applyChainMethod(value: string | string[], method: MethodCall): string | string[] {
  if (method.name === 'joinItems') {
    const sep = typeof method.args?.[0] === 'string' ? String(method.args[0]) : ', ';
    return Array.isArray(value) ? value.join(sep) : value;
  }
  if (method.name === 'getLength') {
    return String(Array.isArray(value) ? value.length : value.length);
  }
  const transform = TRANSFORMS[method.name];
  if (transform) {
    return Array.isArray(value) ? value.map(transform) : transform(value);
  }
  // Unknown chain method: leave the value untouched.
  return value;
}

function applyStringMethods(base: string, methods: MethodCall[]): string {
  let value: string | string[] = base;
  for (const m of methods) value = applyChainMethod(value, m);
  return Array.isArray(value) ? value.join(', ') : value;
}

// ─── Selection ─────────────────────────────────────────────────────────────

function itemWeights(items: ListItem[], ctx: EvalContext): number[] {
  return items.map((item) => {
    if (item.weight == null) return 1;
    if (typeof item.weight === 'number') return item.weight;
    // Dynamic weight expression.
    const result = evalExpr({ t: 'rawExpr', source: item.weight.expr }, ctx);
    const n = Number(result);
    return Number.isFinite(n) ? n : 1;
  });
}

export function selectOne(node: ListNode, ctx: EvalContext): string {
  if (node.items.length === 0) return '';
  guardDepth(ctx);
  try {
    const weights = itemWeights(node.items, ctx);
    const i = ctx.rng.weightedIndex(weights);
    return renderItem(node, node.items[i], ctx);
  } finally {
    releaseDepth(ctx);
  }
}

/**
 * Render one item. For an object-list (the list has a $output template), bind
 * the item's properties as `this.*` and render the template; otherwise render
 * the item's own content.
 */
function renderItem(node: ListNode, item: ListItem, ctx: EvalContext): string {
  if (node.outputConfig && item.properties) {
    const props: Record<string, string> = {};
    for (const [key, value] of Object.entries(item.properties)) {
      props[key] = evalTemplate(value, ctx);
    }
    const prevThis = ctx.thisScope;
    ctx.thisScope = props;
    try {
      return evalTemplate(node.outputConfig.template, ctx);
    } finally {
      ctx.thisScope = prevThis;
    }
  }
  return evalTemplate(item.content, ctx);
}

function selectMany(node: ListNode, count: number, unique: boolean, ctx: EvalContext): string[] {
  const results: string[] = [];
  if (node.items.length === 0) return results;
  if (unique) {
    const pool = node.items.map((_, i) => i);
    const n = Math.min(count, pool.length);
    for (let k = 0; k < n; k++) {
      const weights = pool.map((i) =>
        typeof node.items[i].weight === 'number' ? (node.items[i].weight as number) : 1,
      );
      const pick = ctx.rng.weightedIndex(weights);
      const itemIndex = pool.splice(pick, 1)[0];
      results.push(renderItem(node, node.items[itemIndex], ctx));
    }
  } else {
    for (let k = 0; k < count; k++) results.push(selectOne(node, ctx));
  }
  return results;
}

function resolveCount(method: MethodCall, ctx: EvalContext): number {
  const a = method.args ?? [];
  const lo = Number(a[0] ?? 1);
  if (a.length >= 2) {
    const hi = Number(a[1]);
    if (Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo) {
      return lo + ctx.rng.int(hi - lo + 1);
    }
  }
  return Number.isFinite(lo) ? lo : 1;
}

function applySelection(node: ListNode, method: MethodCall, ctx: EvalContext): string | string[] {
  switch (method.name) {
    case 'selectOne':
    case 'evaluateItem':
      return selectOne(node, ctx);
    case 'selectAll':
      return node.items.map((it) => renderItem(node, it, ctx));
    case 'selectMany':
      return selectMany(node, resolveCount(method, ctx), false, ctx);
    case 'selectUnique':
      return selectMany(node, resolveCount(method, ctx), true, ctx);
    case 'consumableList':
      return consumeOne(node, ctx);
    default:
      return selectOne(node, ctx);
  }
}

function consumeOne(node: ListNode, ctx: EvalContext): string {
  const key = node.id;
  let remaining = ctx.consumables.get(key);
  if (!remaining || remaining.length === 0) {
    remaining = node.items.map((_, i) => i);
    ctx.consumables.set(key, remaining);
  }
  if (remaining.length === 0) return '';
  const pick = ctx.rng.int(remaining.length);
  const itemIndex = remaining.splice(pick, 1)[0];
  return renderItem(node, node.items[itemIndex], ctx);
}

function applyIntrospection(node: ListNode, method: MethodCall): string {
  switch (method.name) {
    case 'getName':
      return node.name;
    case 'getChildNames':
      return Object.keys(node.children ?? {}).join(', ');
    case 'getLength':
      return String(node.items.length);
    case 'getOdds':
      return String(node.items.length);
    default:
      return node.name;
  }
}

// ─── Inline lists ────────────────────────────────────────────────────────

function evalInline(
  node: Extract<TemplateNode, { kind: 'inline' }>,
  ctx: EvalContext,
): string {
  if (node.options.length === 0) return '';
  const weights = node.options.map((_, i) => {
    const w = node.weights?.[i];
    return w == null ? 1 : w;
  });
  const i = ctx.rng.weightedIndex(weights);
  return evalTemplate(node.options[i], ctx);
}

// ─── Plugin preview shim ─────────────────────────────────────────────────

function evalPluginShim(importName: string, args: PluginArg[], ctx: EvalContext): string {
  const parts = args.map((a) => `${a.key}: ${evalTemplate(a.value, ctx)}`);
  return `⟨${importName}${parts.length ? ' — ' + parts.join(', ') : ''}⟩`;
}

// ─── Expressions ──────────────────────────────────────────────────────────

type ExprResult = string | number | boolean;

export function evalExpr(expr: ExprNode, ctx: EvalContext): ExprResult {
  switch (expr.t) {
    case 'lit':
      return expr.value;
    case 'varRef': {
      const raw = ctx.scope.get(expr.name) ?? '';
      const n = Number(raw);
      return raw !== '' && Number.isFinite(n) ? n : raw;
    }
    case 'listRef':
      return evalRef(expr.target, expr.methods, ctx);
    case 'string':
      return evalTemplate(expr.parts, ctx);
    case 'unary': {
      const v = evalExpr(expr.operand, ctx);
      return expr.op === '!' ? !truthy(v) : -Number(v);
    }
    case 'ternary':
      return truthy(evalExpr(expr.test, ctx))
        ? evalExpr(expr.then, ctx)
        : evalExpr(expr.else, ctx);
    case 'binary':
      return evalBinary(expr.op, evalExpr(expr.l, ctx), evalExpr(expr.r, ctx));
    case 'rawExpr':
      // Escape hatch: not evaluated in preview. Surface as an inert placeholder.
      return `⟨js⟩`;
    default: {
      const _exhaustive: never = expr;
      return String(_exhaustive);
    }
  }
}

function evalBinary(op: string, l: ExprResult, r: ExprResult): ExprResult {
  switch (op) {
    case '+':
      return typeof l === 'number' && typeof r === 'number' ? l + r : String(l) + String(r);
    case '-':
      return Number(l) - Number(r);
    case '*':
      return Number(l) * Number(r);
    case '/':
      return Number(l) / Number(r);
    case '%':
      return Number(l) % Number(r);
    case '>':
      return Number(l) > Number(r);
    case '<':
      return Number(l) < Number(r);
    case '>=':
      return Number(l) >= Number(r);
    case '<=':
      return Number(l) <= Number(r);
    case '==':
      return l === r;
    case '!=':
      return l !== r;
    case '&&':
      return truthy(l) && truthy(r);
    case '||':
      return truthy(l) || truthy(r);
    default:
      return '';
  }
}

function truthy(v: ExprResult): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return v !== '' && v !== 'false';
}

function stringifyExprResult(v: ExprResult): string {
  return typeof v === 'string' ? v : String(v);
}
