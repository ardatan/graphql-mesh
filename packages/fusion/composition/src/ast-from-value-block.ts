/**
 * Join-arg helpers for lean supergraph emit.
 *
 * Subgraph SDL keeps multiline / indented Connectors & thrift mappings for humans.
 * Supergraph `@join__directive(args:)` uses normal quoted strings (GraphQL escapes
 * embedded newlines as `\\n`) so the SG stays denser than `"""` blocks - thrift
 * compact-mapping still receives real newlines after parse (do not collapse
 * whitespace: thrift args are line-oriented).
 */

/** Drop empty-string / nullish values (e.g. thrift `args: ""`) from join args. */
export function omitEmptyDirectiveArgValues(
  args: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (value == null || value === '') {
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

/** Prepare join args: omit empty only (preserve newlines for thrift/sql parsers). */
export function prepareJoinDirectiveArgs(args: Record<string, unknown>): Record<string, unknown> {
  return omitEmptyDirectiveArgValues(args);
}
