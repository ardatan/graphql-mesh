/**
 * Join-arg helpers for lean supergraph emit.
 *
 * Subgraph SDL keeps multiline / indented Connectors & thrift mappings for humans.
 * Supergraph `@join__directive(args:)` uses normal quoted strings (GraphQL escapes
 * embedded newlines as `\\n`) so the SG stays denser than `"""` blocks - thrift
 * compact-mapping still receives real newlines after parse (do not collapse
 * whitespace: thrift args are line-oriented).
 */

/**
 * Drop nullish values, and empty-string only for `args` (e.g. thrift / protobuf
 * `args: ""`). Keep other empty strings such as protobuf `selection: ""` so join
 * reconstitution can tell "empty mapping" from "argument absent".
 */
export function omitEmptyDirectiveArgValues(
  args: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (value == null) {
      continue;
    }
    // Only `args` uses empty-omit; required compact mappings like `selection: ""`
    // must survive join so transports do not treat them as missing.
    if (value === '' && key === 'args') {
      continue;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      const nested = omitEmptyDirectiveArgValues(value as Record<string, unknown>);
      if (Object.keys(nested).length) {
        out[key] = nested;
      }
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Prepare join args: omit empty `args` only (preserve newlines for thrift/sql parsers). */
export function prepareJoinDirectiveArgs(args: Record<string, unknown>): Record<string, unknown> {
  return omitEmptyDirectiveArgValues(args);
}
