/**
 * After subgraph transforms (e.g. naming-convention) re-introduce Mesh `@enum`,
 * bake JSON↔GraphQL remaps into `@connect(selection:)` and strip `@enum` so
 * Apollo Router does not need Mesh runtime enum wiring.
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

function getEnumJsonRemap(enumType: GraphQLEnumType): Array<[string, unknown]> {
  const pairs: Array<[string, unknown]> = [];
  for (const ev of enumType.getValues()) {
    const fromDirs = getDirectiveExtensions(ev)?.enum?.[0]?.value;
    if (fromDirs == null) continue;
    let jsonValue: unknown = fromDirs;
    if (typeof fromDirs === 'string') {
      try {
        jsonValue = JSON.parse(fromDirs);
      } catch {
        jsonValue = fromDirs;
      }
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
  const pairs = getEnumJsonRemap(t);
  if (!pairs.length) return selection;
  const arms = pairs
    .map(([gql, json]) => `[${JSON.stringify(json)}, ${JSON.stringify(gql)}]`)
    .join(', ');
  if (isList) {
    return `$->map(@->match(${arms}, [@, @]))`;
  }
  return `$->match(${arms}, [@, $])`;
}

function stripEnumDirective<T extends { extensions?: any; astNode?: any }>(config: T): T {
  const ext = config.extensions as { directives?: Record<string, unknown> } | undefined;
  const hasExt = Boolean(ext?.directives?.enum);
  const hasAst = Boolean(config.astNode?.directives?.some((d: any) => d.name.value === 'enum'));
  if (!hasExt && !hasAst) return config;
  const directives = { ...(ext?.directives || {}) };
  delete directives.enum;
  return {
    ...config,
    extensions: { ...ext, directives },
    astNode: undefined,
  };
}

function schemaHasEnumUsage(schema: GraphQLSchema): boolean {
  for (const type of Object.values(schema.getTypeMap())) {
    if (!('getValues' in type)) continue;
    for (const ev of (type as GraphQLEnumType).getValues()) {
      if (getDirectiveExtensions(ev)?.enum?.length) return true;
      if (ev.astNode?.directives?.some(d => d.name.value === 'enum')) return true;
    }
  }
  return false;
}

/** Bake `@enum` into connect selections and strip the Mesh directive from connectors subgraphs. */
export function bakeConnectEnumDirectives(schema: GraphQLSchema): GraphQLSchema {
  let next = mapSchema(schema, {
    [MapperKind.ROOT_FIELD]: fieldConfig => {
      const dirs = getDirectiveExtensions(fieldConfig) || {};
      if (!dirs.connect?.length || !fieldConfig.type) return fieldConfig;
      let changed = false;
      const connect = dirs.connect.map((c: any) => {
        if (typeof c?.selection !== 'string') return c;
        const baked = bakeEnumRootSelection(c.selection, fieldConfig.type);
        if (baked === c.selection) return c;
        changed = true;
        return { ...c, selection: baked };
      });
      if (!changed) return fieldConfig;
      return {
        ...fieldConfig,
        extensions: {
          ...fieldConfig.extensions,
          directives: { ...dirs, connect },
        },
        astNode: undefined,
      };
    },
  });
  next = mapSchema(next, {
    [MapperKind.ENUM_VALUE]: enumValueConfig => stripEnumDirective(enumValueConfig),
  });
  if (!schemaHasEnumUsage(next) && next.getDirective('enum')) {
    const config = next.toConfig();
    next = new GraphQLSchema({
      ...config,
      directives: config.directives.filter(d => d.name !== 'enum'),
    });
  }
  return next;
}
