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
  opts?: { isNeo4jModelField?: boolean; subgraph?: string },
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
  dirs.alias = [
    {
      ...(opts.subgraph ? { subgraph: opts.subgraph } : {}),
      property: originalFieldName,
    },
  ];
  return dirs;
}

/** True when the parent type is a Neo4j model (`@node` or `@relationshipProperties`). */
export function isNeo4jModelTypeDirectives(
  typeDirectives: Record<string, any[]> | undefined,
): boolean {
  return Boolean(typeDirectives?.node?.length || typeDirectives?.relationshipProperties?.length);
}

/**
 * Rewrite `$oldArg` → `$newArg` in a Cypher statement after GraphQL argument renames.
 * Skips string literals and backtick-quoted identifiers so text like `'$title'` is unchanged.
 */
export function rewriteCypherParamNames(
  statement: string,
  argRenameMap: Map<string, string>,
): string {
  if (!statement || argRenameMap.size === 0) {
    return statement;
  }
  let out = '';
  let i = 0;
  while (i < statement.length) {
    const c = statement[i];
    if (c === "'") {
      out += c;
      i++;
      while (i < statement.length) {
        if (statement[i] === "'" && statement[i + 1] === "'") {
          out += "''";
          i += 2;
          continue;
        }
        out += statement[i];
        if (statement[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '"') {
      out += c;
      i++;
      while (i < statement.length) {
        if (statement[i] === '\\' && i + 1 < statement.length) {
          out += statement[i] + statement[i + 1];
          i += 2;
          continue;
        }
        out += statement[i];
        if (statement[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '`') {
      out += c;
      i++;
      while (i < statement.length) {
        if (statement[i] === '`' && statement[i + 1] === '`') {
          out += '``';
          i += 2;
          continue;
        }
        out += statement[i];
        if (statement[i] === '`') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '$') {
      const start = i;
      i++;
      let name = '';
      while (i < statement.length && /[\w]/.test(statement[i])) {
        name += statement[i++];
      }
      if (name && !CYPHER_RESERVED_VARS.has(name) && argRenameMap.has(name)) {
        out += `$${argRenameMap.get(name)}`;
      } else {
        out += statement.slice(start, i);
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
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
  const hasRewritable = [...argRenameMap.keys()].some(
    name => name && !CYPHER_RESERVED_VARS.has(name),
  );
  if (!hasRewritable) {
    return fieldDirectives;
  }
  const nextCypher = fieldDirectives.cypher.map((cypherArgs: any) => {
    if (typeof cypherArgs?.statement !== 'string') {
      return cypherArgs;
    }
    return {
      ...cypherArgs,
      statement: rewriteCypherParamNames(cypherArgs.statement, argRenameMap),
    };
  });
  return {
    ...fieldDirectives,
    cypher: nextCypher,
  };
}

/**
 * After a GraphQL type rename, rewrite `@relationship(properties: "OldName")` to the
 * new relationship-properties type name. Leaves `@relationship(type:)` (DB type) alone.
 */
export function rewriteNeo4jRelationshipPropertiesRefs(
  fieldDirectives: Record<string, any[]> | undefined,
  typeRenameMap: Map<string, string>,
): Record<string, any[]> | undefined {
  if (!fieldDirectives?.relationship?.length || typeRenameMap.size === 0) {
    return fieldDirectives;
  }
  let changed = false;
  const nextRelationship = fieldDirectives.relationship.map((relArgs: any) => {
    const properties = relArgs?.properties;
    if (typeof properties !== 'string' || !typeRenameMap.has(properties)) {
      return relArgs;
    }
    changed = true;
    return {
      ...relArgs,
      properties: typeRenameMap.get(properties),
    };
  });
  if (!changed) {
    return fieldDirectives;
  }
  return {
    ...fieldDirectives,
    relationship: nextRelationship,
  };
}
