/**
 * Neo4j GraphQL maps GraphQL names to the database via its own directives
 * (`@node(labels:)`, `@alias(property:)`, `@plural`), not Mesh `@source` /
 * `@meshSource`. Rename / naming-convention / prefix transforms stamp or keep
 * those identity directives when GraphQL names change.
 *
 * `@cypher(statement:)` binds GraphQL arguments as `$argName` (not `$args.argName`).
 * Arg renames rewrite those bindings; `$this` / `$jwt` / `$context` stay reserved.
 */

const NEO4J_NON_PROPERTY_FIELD_DIRECTIVES = new Set([
  'relationship',
  'cypher',
  'customResolver',
  'declareRelationship',
]);

const CYPHER_RESERVED_VARS = new Set(['this', 'jwt', 'context']);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True when the type (or its directives bag) is a Neo4j `@node` model. */
export function hasNeo4jNodeDirective(typeDirectives: Record<string, any[]> | undefined): boolean {
  return Boolean(typeDirectives?.node?.length);
}

/**
 * After a GraphQL type rename, keep the Neo4j label(s) bound to the original name
 * unless `@node(labels:)` was already set by the author / a prior transform.
 */
export function ensureNeo4jNodeLabels(
  typeDirectives: Record<string, any[]> | undefined,
  originalTypeName: string,
): Record<string, any[]> | undefined {
  if (!typeDirectives?.node?.length) {
    return typeDirectives;
  }
  const existing = typeDirectives.node[0] || {};
  if (Array.isArray(existing.labels) && existing.labels.length > 0) {
    return typeDirectives;
  }
  return {
    ...typeDirectives,
    node: [
      {
        ...existing,
        labels: [originalTypeName],
      },
    ],
  };
}

/**
 * After a GraphQL field rename on a `@node` / `@relationshipProperties` type,
 * stamp `@alias(property: originalName)` unless the field is a relationship /
 * cypher field or already has `@alias`.
 */
export function ensureNeo4jFieldAlias(
  fieldDirectives: Record<string, any[]> | undefined,
  originalFieldName: string,
  opts?: { isNeo4jModelField?: boolean },
): Record<string, any[]> | undefined {
  if (!opts?.isNeo4jModelField) {
    return fieldDirectives;
  }
  const dirs: Record<string, any[]> = { ...(fieldDirectives || {}) };
  if (dirs.alias?.length) {
    return dirs;
  }
  for (const name of NEO4J_NON_PROPERTY_FIELD_DIRECTIVES) {
    if (dirs[name]?.length) {
      return fieldDirectives;
    }
  }
  dirs.alias = [{ property: originalFieldName }];
  return dirs;
}

/** True when the parent type is a Neo4j model (`@node` or `@relationshipProperties`). */
export function isNeo4jModelTypeDirectives(
  typeDirectives: Record<string, any[]> | undefined,
): boolean {
  return Boolean(typeDirectives?.node?.length || typeDirectives?.relationshipProperties?.length);
}

/**
 * Rewrite `$oldArg` → `$newArg` inside `@cypher(statement:)` after argument renames.
 * Does not use the Connectors `$args.` rewrite registry.
 */
export function rewriteNeo4jCypherArgReferences(
  fieldDirectives: Record<string, any[]> | undefined,
  argRenameMap: Map<string, string>,
): Record<string, any[]> | undefined {
  if (!fieldDirectives?.cypher?.length || argRenameMap.size === 0) {
    return fieldDirectives;
  }
  const names = [...argRenameMap.keys()]
    .filter(name => name && !CYPHER_RESERVED_VARS.has(name))
    .map(escapeRegExp);
  if (!names.length) {
    return fieldDirectives;
  }
  const re = new RegExp(`\\$(${names.join('|')})(?![\\w])`, 'g');
  const nextCypher = fieldDirectives.cypher.map((cypherArgs: any) => {
    if (typeof cypherArgs?.statement !== 'string') {
      return cypherArgs;
    }
    return {
      ...cypherArgs,
      statement: cypherArgs.statement.replace(
        re,
        (_m: string, name: string) => `$${argRenameMap.get(name) ?? name}`,
      ),
    };
  });
  return {
    ...fieldDirectives,
    cypher: nextCypher,
  };
}
