import { camelCase } from 'change-case';
import pluralize from 'pluralize';

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

/** Leading underscores Neo4j restores after camelCase/pluralize (`_Movie` → `_movies`). */
function leadingUnderscores(name: string): string {
  const match = /^(_+).+/.exec(name);
  return match?.[1] || '';
}

/**
 * Match `@neo4j/graphql` root pluralization (`leadingUnderscores + pluralize(camelCase)`).
 * Used when stamping `@plural(value:)` so generated roots keep the pre-rename family
 * (`Movie` → `movies`, `_Movie` → `_movies`).
 */
export function neo4jDefaultPlural(typeName: string): string {
  return `${leadingUnderscores(typeName)}${pluralize(camelCase(typeName))}`;
}

/**
 * Normalize `@node(labels:)` from getDirectiveExtensions: arrays stay, a singleton
 * string becomes a one-element list (GraphQL list coercion may be skipped without schema).
 */
export function normalizeNeo4jNodeLabels(labels: unknown): string[] | undefined {
  if (Array.isArray(labels)) {
    const normalized = labels.filter(
      (label): label is string => typeof label === 'string' && label.length > 0,
    );
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof labels === 'string' && labels.length > 0) {
    return [labels];
  }
  return undefined;
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
  const normalizedLabels = normalizeNeo4jNodeLabels(existing.labels);
  if (normalizedLabels) {
    if (normalizedLabels === existing.labels) {
      return typeDirectives;
    }
    return {
      ...typeDirectives,
      node: [
        {
          ...existing,
          labels: normalizedLabels,
        },
      ],
    };
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
 * After a GraphQL type rename on `@node`, stamp `@plural(value:)` so Neo4j keeps the
 * original generated root family (`movies*` when `Movie` → `Film`). Plural comes from
 * the original GraphQL type name (not DB labels). Leaves an author / prior `@plural` alone.
 */
export function ensureNeo4jPlural(
  typeDirectives: Record<string, any[]> | undefined,
  originalTypeName: string,
): Record<string, any[]> | undefined {
  if (!typeDirectives?.node?.length) {
    return typeDirectives;
  }
  if (typeDirectives.plural?.length) {
    return typeDirectives;
  }
  const nodeArgs = typeDirectives.node[0] || {};
  return {
    ...typeDirectives,
    plural: [
      {
        ...(typeof nodeArgs.subgraph === 'string' ? { subgraph: nodeArgs.subgraph } : {}),
        value: neo4jDefaultPlural(originalTypeName),
      },
    ],
  };
}

/** `@node(labels:)` then `@plural(value:)` for a renamed Neo4j node type. */
export function ensureNeo4jTypeIdentity(
  typeDirectives: Record<string, any[]> | undefined,
  originalTypeName: string,
): Record<string, any[]> | undefined {
  return ensureNeo4jPlural(
    ensureNeo4jNodeLabels(typeDirectives, originalTypeName),
    originalTypeName,
  );
}

/**
 * Stamp a directive bag onto `extensions.directives` and clear AST sources that
 * would re-merge the same applications (`astNode` + matching `extensionASTNodes`
 * directives). Without this, `getDirectiveExtensions` returns stamped `@node`
 * plus the original extend-type `@node`, and the printer can emit both.
 */
export function typeConfigWithDirectiveExtensions(
  type: { extensions?: Record<string, any>; toConfig(): any },
  directives: Record<string, any[]>,
): any {
  const config = type.toConfig();
  const consumed = new Set(Object.keys(directives));
  return {
    ...config,
    extensions: {
      ...(type.extensions || {}),
      directives,
    },
    astNode: undefined,
    extensionASTNodes: config.extensionASTNodes?.map(
      (ext: { directives?: ReadonlyArray<{ name: { value: string } }> }) => ({
        ...ext,
        directives: ext.directives?.filter(d => !consumed.has(d.name.value)),
      }),
    ),
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

function cypherParamToken(name: string): string {
  if (/^[\w]+$/.test(name)) {
    return `$${name}`;
  }
  return '$`' + name.replace(/`/g, '``') + '`';
}

/**
 * Rewrite `$oldArg` → `$newArg` in a Cypher statement after GraphQL argument renames.
 * Skips string literals and backtick-quoted identifiers so text like `'$title'` is unchanged.
 * Rewrites `$`title`` parameter forms; leaves standalone `` `ident` `` unchanged.
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
    // Line comment: ends at `\r` or `\n` (Cypher); preserve the terminator.
    if (c === '/' && statement[i + 1] === '/') {
      while (i < statement.length && statement[i] !== '\n' && statement[i] !== '\r') {
        out += statement[i++];
      }
      continue;
    }
    // Block comment: copy through terminator.
    if (c === '/' && statement[i + 1] === '*') {
      out += statement[i++];
      out += statement[i++];
      while (i < statement.length) {
        if (statement[i] === '*' && statement[i + 1] === '/') {
          out += '*/';
          i += 2;
          break;
        }
        out += statement[i++];
      }
      continue;
    }
    if (c === "'") {
      out += c;
      i++;
      while (i < statement.length) {
        if (statement[i] === '\\' && i + 1 < statement.length) {
          out += statement[i] + statement[i + 1];
          i += 2;
          continue;
        }
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
      // `$`title`` — backtick-delimited parameter name.
      if (statement[i] === '`') {
        i++;
        let name = '';
        while (i < statement.length) {
          if (statement[i] === '`' && statement[i + 1] === '`') {
            name += '`';
            i += 2;
            continue;
          }
          if (statement[i] === '`') {
            i++;
            break;
          }
          name += statement[i++];
        }
        if (name && !CYPHER_RESERVED_VARS.has(name) && argRenameMap.has(name)) {
          out += cypherParamToken(argRenameMap.get(name)!);
        } else {
          out += statement.slice(start, i);
        }
        continue;
      }
      let name = '';
      while (i < statement.length && /[\w]/.test(statement[i])) {
        name += statement[i++];
      }
      if (name && !CYPHER_RESERVED_VARS.has(name) && argRenameMap.has(name)) {
        out += cypherParamToken(argRenameMap.get(name)!);
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
