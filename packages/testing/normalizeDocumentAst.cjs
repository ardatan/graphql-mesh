/**
 * Canonicalize GraphQL Document AST JSON (compose `--output json`) for
 * GraphQL 16/17 shared snapshots.
 *
 * graphql-js 16 often emits empty `directives: []` / `arguments: []` /
 * `interfaces: []` arrays that 17 omits (or the reverse). Strip empty arrays
 * with those keys so both majors round-trip to one snap.
 *
 * @param {string|object} value file contents or parsed AST
 * @returns {string} stable JSON string for snapshots
 */
function normalizeDocumentAst(value) {
  let ast = value;
  if (typeof value === 'string') {
    try {
      ast = JSON.parse(value);
    } catch {
      return value;
    }
  }
  const cleaned = stripEmptyAstArrays(structuredClone(ast));
  return JSON.stringify(cleaned);
}

const EMPTY_ARRAY_KEYS = new Set(['directives', 'arguments', 'interfaces']);

function stripEmptyAstArrays(node) {
  if (Array.isArray(node)) {
    return node.map(stripEmptyAstArrays);
  }
  if (node == null || typeof node !== 'object') {
    return node;
  }
  const out = {};
  for (const [key, val] of Object.entries(node)) {
    if (EMPTY_ARRAY_KEYS.has(key) && Array.isArray(val) && val.length === 0) {
      continue;
    }
    out[key] = stripEmptyAstArrays(val);
  }
  return out;
}

module.exports = {
  normalizeDocumentAst,
  stripEmptyAstArrays,
};
