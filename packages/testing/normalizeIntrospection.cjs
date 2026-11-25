/**
 * Canonicalize GraphQL introspection JSON for version-stable Jest snapshots.
 *
 * graphql-js 16 vs 17 disagree on built-in introspection details:
 * - `__DirectiveLocation.FRAGMENT_VARIABLE_DEFINITION` (17 only)
 * - `@deprecated(reason:)` nullability (NonNull in 17)
 * - `includeDeprecated` arg nullability on introspection fields
 * - directive `locations` array order
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function normalizeIntrospection(value) {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  return canonicalize(structuredClone(value));
}

function canonicalize(node) {
  if (Array.isArray(node)) {
    return node.map(canonicalize);
  }
  if (node == null || typeof node !== 'object') {
    return node;
  }

  // __DirectiveLocation enum values
  if (
    node.kind === 'ENUM' &&
    node.name === '__DirectiveLocation' &&
    Array.isArray(node.enumValues)
  ) {
    node.enumValues = node.enumValues
      .filter(v => v && v.name !== 'FRAGMENT_VARIABLE_DEFINITION')
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  // Built-in @deprecated and other directives on __Schema
  if (node.name === 'deprecated' && Array.isArray(node.args) && Array.isArray(node.locations)) {
    for (const arg of node.args) {
      if (arg?.name === 'reason') {
        arg.type = unwrapNonNullToNamed(arg.type, 'String');
      }
    }
    node.locations = [...node.locations].sort();
  }

  if (Array.isArray(node.locations) && typeof node.locations[0] === 'string') {
    node.locations = [...node.locations].sort();
  }

  // includeDeprecated: Boolean! (17) vs Boolean (16)
  if (node.name === 'includeDeprecated' && node.type) {
    node.type = unwrapNonNullToNamed(node.type, 'Boolean');
  }

  for (const key of Object.keys(node)) {
    node[key] = canonicalize(node[key]);
  }
  return node;
}

function unwrapNonNullToNamed(typeNode, expectedName) {
  if (!typeNode || typeof typeNode !== 'object') return typeNode;
  if (typeNode.kind === 'NON_NULL' && typeNode.ofType) {
    const inner = unwrapNonNullToNamed(typeNode.ofType, expectedName);
    if (inner?.kind === 'SCALAR' && inner.name === expectedName) {
      return { kind: 'SCALAR', name: expectedName, ofType: null };
    }
    return { kind: 'NON_NULL', name: null, ofType: inner };
  }
  return typeNode;
}

function looksLikeIntrospection(val) {
  if (val == null || typeof val !== 'object' || Array.isArray(val)) return false;
  const schema = val.__schema || val.data?.__schema;
  return schema != null && typeof schema === 'object' && Array.isArray(schema.types);
}

module.exports = {
  normalizeIntrospection,
  looksLikeIntrospection,
};
