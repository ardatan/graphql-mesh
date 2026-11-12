/**
 * When a transform renames enum values on a Federation Connectors subgraph,
 * bake JSON↔GraphQL remaps into `@connect(selection:)` / path `->match` and
 * avoid Mesh `@enum` (Router has no Mesh enum runtime).
 */
import {
  GraphQLSchema,
  isEnumType,
  isListType,
  isNonNullType,
  type GraphQLEnumType,
  type GraphQLOutputType,
} from 'graphql';
import { getDirectiveExtensions, MapperKind, mapSchema } from '@graphql-tools/utils';

function enumJsonRemapPairs(enumType: GraphQLEnumType): Array<[string, unknown]> {
  const pairs: Array<[string, unknown]> = [];
  for (const ev of enumType.getValues()) {
    const fromDirs = getDirectiveExtensions(ev)?.enum?.[0]?.value;
    let jsonValue: unknown = ev.value;
    if (typeof fromDirs === 'string') {
      try {
        jsonValue = JSON.parse(fromDirs);
      } catch {
        jsonValue = fromDirs;
      }
    } else if (fromDirs != null) {
      jsonValue = fromDirs;
    }
    if (jsonValue != null && String(jsonValue) !== ev.name) {
      pairs.push([ev.name, jsonValue]);
    }
  }
  return pairs;
}

function bakeEnumRootSelection(selection: string, returnType: GraphQLOutputType): string {
  if (selection !== '$') return selection;
  let t: GraphQLOutputType = returnType;
  let isList = false;
  while (isNonNullType(t)) t = t.ofType;
  if (isListType(t)) {
    isList = true;
    t = t.ofType;
    while (isNonNullType(t)) t = t.ofType;
  }
  if (!isEnumType(t)) return selection;
  const pairs = enumJsonRemapPairs(t);
  if (!pairs.length) return selection;
  const arms = pairs
    .map(([gql, json]) => `[${JSON.stringify(json)}, ${JSON.stringify(gql)}]`)
    .join(', ');
  return isList ? `$->map(@->match(${arms}, [@, @]))` : `$->match(${arms}, [@, $])`;
}

function wrapArgExprWithEnumMatch(argExpr: string, enumType: GraphQLEnumType): string {
  const pairs = enumJsonRemapPairs(enumType);
  if (!pairs.length) return argExpr;
  const arms = pairs
    .map(([gql, json]) => `[${JSON.stringify(gql)}, ${JSON.stringify(json)}]`)
    .join(', ');
  return `${argExpr}->match(${arms}, [@, ${argExpr}])`;
}

function rewritePathEnumArgs(
  path: string,
  args: Record<string, { type: unknown }> | undefined,
): string {
  if (!path || !args) return path;
  let next = path;
  for (const [argName, arg] of Object.entries(args)) {
    let t: any = arg.type;
    while (t && (isNonNullType(t) || isListType(t))) t = t.ofType;
    if (!isEnumType(t)) continue;
    const pairs = enumJsonRemapPairs(t);
    if (!pairs.length) continue;
    const bare = `$args.${argName}`;
    if (next.includes(`${bare}->match(`)) continue;
    const wrapped = wrapArgExprWithEnumMatch(bare, t);
    next = next.replaceAll(`{${bare}}`, `{${wrapped}}`);
  }
  return next;
}

function stripEnumDirective<T extends { extensions?: any; astNode?: any }>(config: T): T {
  const ext = config.extensions as { directives?: Record<string, unknown> } | undefined;
  if (
    !ext?.directives?.enum &&
    !config.astNode?.directives?.some((d: any) => d.name.value === 'enum')
  ) {
    return config;
  }
  const directives = { ...(ext?.directives || {}) };
  delete directives.enum;
  return { ...config, extensions: { ...ext, directives }, astNode: undefined };
}

function schemaUsesConnect(schema: GraphQLSchema): boolean {
  for (const type of Object.values(schema.getTypeMap())) {
    if (!('getFields' in type)) continue;
    for (const field of Object.values((type as any).getFields())) {
      if (getDirectiveExtensions(field)?.connect?.length) return true;
    }
  }
  const schemaDirs = getDirectiveExtensions(schema);
  return Boolean(
    schemaDirs?.link?.some(
      (l: any) => typeof l?.url === 'string' && l.url.includes('specs.apollo.dev/connect'),
    ),
  );
}

/**
 * For Federation Connectors subgraphs: bake enum remaps into `@connect` and drop `@enum`.
 * No-op for non-connectors schemas (Mesh `@enum` runtime still applies there).
 */
export function bakeConnectEnumsInTransform(schema: GraphQLSchema): GraphQLSchema {
  if (!schemaUsesConnect(schema)) {
    return schema;
  }
  let next = mapSchema(schema, {
    [MapperKind.ROOT_FIELD]: fieldConfig => {
      const dirs = getDirectiveExtensions(fieldConfig) || {};
      if (!dirs.connect?.length) return fieldConfig;
      let changed = false;
      const connect = dirs.connect.map((c: any) => {
        let nextConnect = { ...c };
        if (typeof nextConnect.selection === 'string' && fieldConfig.type) {
          const baked = bakeEnumRootSelection(nextConnect.selection, fieldConfig.type);
          if (baked !== nextConnect.selection) {
            nextConnect = { ...nextConnect, selection: baked };
            changed = true;
          }
        }
        if (nextConnect.http && fieldConfig.args) {
          const http = { ...nextConnect.http };
          for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']) {
            if (typeof http[method] === 'string') {
              const rewritten = rewritePathEnumArgs(http[method], fieldConfig.args as any);
              if (rewritten !== http[method]) {
                http[method] = rewritten;
                changed = true;
              }
            }
          }
          nextConnect = { ...nextConnect, http };
        }
        return nextConnect;
      });
      if (!changed) return fieldConfig;
      return {
        ...fieldConfig,
        extensions: { ...fieldConfig.extensions, directives: { ...dirs, connect } },
        astNode: undefined,
      };
    },
  });
  next = mapSchema(next, {
    [MapperKind.ENUM_VALUE]: enumValueConfig => stripEnumDirective(enumValueConfig),
  });
  let hasEnumUsage = false;
  for (const type of Object.values(next.getTypeMap())) {
    if (!('getValues' in type)) continue;
    for (const ev of (type as GraphQLEnumType).getValues()) {
      if (getDirectiveExtensions(ev)?.enum?.length) {
        hasEnumUsage = true;
        break;
      }
    }
    if (hasEnumUsage) break;
  }
  if (!hasEnumUsage && next.getDirective('enum')) {
    const config = next.toConfig();
    next = new GraphQLSchema({
      ...config,
      directives: config.directives.filter(d => d.name !== 'enum'),
    });
  }
  return next;
}
