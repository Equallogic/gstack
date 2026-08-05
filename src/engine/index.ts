/**
 * Perchance evaluation engine — a direct tree-walk of the GeneratorProject
 * JSON model (no Perchance-text parser). Produces text/HTML for the live
 * preview. Modeled on Tracery's expansion loop, feature-checked against the
 * philpax/perchance-interpreter reimplementation.
 */
export { makeContext, type EvalContext, EngineRecursionError } from './context';
export { evalTemplate, evalExpr, selectOne } from './evaluate';
export {
  renderProject,
  renderOutputHtml,
  renderOutputRefInner,
} from './render';
export { resolveList } from './resolve';
