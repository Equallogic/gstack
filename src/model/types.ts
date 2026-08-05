/**
 * The canonical data model for a Perchance generator project.
 *
 * PRINCIPLE 0: This JSON tree is the ONLY source of truth. The builder UI edits
 * it, the evaluation engine reads it to produce a live preview, and the
 * serializer reads it to produce Perchance source text. Perchance source is an
 * OUTPUT format only — nothing in the app ever parses Perchance text back into
 * this model (that would only be needed for the deferred "import" feature).
 *
 * The model mirrors Perchance's own two-panel structure:
 *   - the "data layer"  (lists + variables)   -> Perchance "lists panel"
 *   - the "presentation layer" (output blocks) -> Perchance "HTML panel"
 */

export type ListId = string;

export interface GeneratorProject {
  schemaVersion: 1;
  meta: ProjectMeta;
  /** Lists keyed by stable id so references survive renames. */
  lists: Record<ListId, ListNode>;
  /** Ordering of top-level lists in the UI and serialized output. */
  listOrder: ListId[];
  variables: VariableDef[];
  imports: PluginImport[];
  /** The "HTML panel" — the visible UI of the generator. */
  output: OutputTemplate;
  /** Top-level $output: what importers of this generator receive. Optional. */
  rootOutputListId?: ListId;
  /** Deterministic seed for the live preview (dev/testing). */
  seed?: number;
}

export interface ProjectMeta {
  id: string;
  name: string;
  /** Desired perchance.org URL slug; validated against [a-z0-9-]{4,}. */
  slug?: string;
  description?: string;
}

// ─── Lists ───────────────────────────────────────────────────────────────

export interface ListNode {
  id: ListId;
  /** The identifier emitted in Perchance source. Must be a valid list name. */
  name: string;
  items: ListItem[];
  /** Nested sublists, addressed via dotted paths ([parent.child]). */
  children?: Record<string, ListNode>;
  /** Per-list $output template controlling object-list display formatting. */
  outputConfig?: OutputConfig;
}

export interface ListItem {
  id: string;
  /** Item content is a template that may embed refs, inline lists, etc. */
  content: TemplateNode[];
  /** ^weight. Omitted (or 1) means default weight. */
  weight?: number | { expr: string };
  /** Object-list properties (e.g. name, age) referenced via [this.name]. */
  properties?: Record<string, TemplateNode[]>;
}

export interface OutputConfig {
  /** e.g. "My name is [this.name] and I'm [this.age]". */
  template: TemplateNode[];
}

// ─── Template AST (shared rich-text primitive) ─────────────────────────────
//
// Used uniformly for list-item content, output-block text, and property values,
// so a single evaluator/serializer pair handles all three.

export type TemplateNode =
  | TextNode
  | RefNode
  | InlineListNode
  | VarNode
  | AssignNode
  | CondNode
  | ExprTemplateNode
  | PluginCallNode;

export interface TextNode {
  kind: 'text';
  value: string;
}

/** [animal] or [animal.selectOne] or [animal.mammal.titleCase] */
export interface RefNode {
  kind: 'ref';
  target: RefTarget;
  methods: MethodCall[];
}

/** {a|b|c} anonymous inline list, optionally weighted. */
export interface InlineListNode {
  kind: 'inline';
  options: TemplateNode[][];
  /** Parallel to options; null entries mean default weight. */
  weights?: (number | null)[];
}

/** [name] variable reference. */
export interface VarNode {
  kind: 'var';
  name: string;
  methods: MethodCall[];
}

/** [name = animal.selectOne] assignment. */
export interface AssignNode {
  kind: 'assign';
  name: string;
  expr: ExprNode;
  /** When true, suppress printing the assigned value (silent assignment). */
  silent?: boolean;
}

/** [test ? then : else] inline ternary. */
export interface CondNode {
  kind: 'cond';
  test: ExprNode;
  then: TemplateNode[];
  else: TemplateNode[];
}

/** [age + 1] — a bare expression embedded in a template. */
export interface ExprTemplateNode {
  kind: 'expr';
  expr: ExprNode;
}

/** [image({prompt:'...'}).evaluateItem] — plugin invocation. */
export interface PluginCallNode {
  kind: 'pluginCall';
  importName: string;
  args: PluginArg[];
  methods: MethodCall[];
}

export interface RefTarget {
  /** Preferred: reference a list by its stable id. */
  listId?: ListId;
  /** Dotted path relative to the resolved list, e.g. "mammal.big". */
  path?: string;
  /** Fallback raw name when no listId is available (e.g. imported symbols). */
  rawName?: string;
}

export interface MethodCall {
  name: MethodName;
  args?: (number | string)[];
}

export type MethodName =
  // selection
  | 'selectOne'
  | 'selectMany'
  | 'selectUnique'
  | 'selectAll'
  | 'consumableList'
  | 'evaluateItem'
  // text transforms
  | 'titleCase'
  | 'sentenceCase'
  | 'upperCase'
  | 'lowerCase'
  | 'pluralForm'
  | 'singularForm'
  | 'pastTense'
  | 'presentTense'
  | 'futureTense'
  // introspection
  | 'getName'
  | 'getChildNames'
  | 'getOdds'
  | 'getLength'
  | 'joinItems';

// ─── Expressions (closed grammar — deliberately NOT arbitrary JS) ──────────

export type ExprNode =
  | { t: 'lit'; value: string | number | boolean }
  | { t: 'varRef'; name: string }
  | { t: 'listRef'; target: RefTarget; methods: MethodCall[] }
  | { t: 'binary'; op: BinaryOp; l: ExprNode; r: ExprNode }
  | { t: 'unary'; op: '!' | '-'; operand: ExprNode }
  | { t: 'ternary'; test: ExprNode; then: ExprNode; else: ExprNode }
  | { t: 'string'; parts: TemplateNode[] }
  /** Escape hatch: emitted verbatim, previewed as an inert placeholder. */
  | { t: 'rawExpr'; source: string };

export type BinaryOp =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '>'
  | '<'
  | '>='
  | '<='
  | '=='
  | '!='
  | '&&'
  | '||';

// ─── Variables & imports ───────────────────────────────────────────────────

export interface VariableDef {
  id: string;
  name: string;
  init: ExprNode;
  /** If an input/select drives this variable, the control's block id. */
  boundToControlId?: string;
}

export interface PluginImport {
  id: string;
  /** Local name the plugin is bound to, e.g. "image". */
  importName: string;
  /** Plugin/generator name to import, e.g. "text-to-image-plugin". */
  plugin: string;
}

// ─── Output template (the "HTML panel") ────────────────────────────────────

export interface OutputTemplate {
  blocks: OutputBlock[];
}

export type OutputBlock =
  | HtmlBlock
  | OutputRefBlock
  | ButtonBlock
  | TextInputBlock
  | SelectBlock
  | CheckboxBlock
  | PluginBlock;

export type HtmlTag = 'div' | 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'br';

export interface HtmlBlock {
  kind: 'html';
  id: string;
  tag: HtmlTag;
  content: TemplateNode[];
  attrs?: Record<string, string>;
}

/** Renders a list's evaluated value into the DOM, e.g. <span id="out">[output]</span>. */
export interface OutputRefBlock {
  kind: 'outputRef';
  id: string;
  listId: ListId;
  /** DOM id used by update(...) to re-roll just this block. */
  domId: string;
}

export interface ButtonBlock {
  kind: 'button';
  id: string;
  label: string;
  action: UiAction;
}

export interface TextInputBlock {
  kind: 'textInput';
  id: string;
  label?: string;
  bindVar: string;
  placeholder?: string;
}

export interface SelectBlock {
  kind: 'select';
  id: string;
  label?: string;
  bindVar: string;
  /** Options sourced from a list, or literal strings. */
  optionsListId?: ListId;
  options?: string[];
}

export interface CheckboxBlock {
  kind: 'checkbox';
  id: string;
  label?: string;
  bindVar: string;
}

export interface PluginBlock {
  kind: 'pluginBlock';
  id: string;
  importName: string;
  args: PluginArg[];
}

export type UiAction =
  | { type: 'update'; targetDomIds: string[] }
  | { type: 'custom'; raw: string };

export interface PluginArg {
  key: string;
  value: TemplateNode[];
}
