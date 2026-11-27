import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
  type GraphQLFieldConfig,
  type GraphQLResolveInfo,
} from 'graphql';
import { entitiesResolver } from '@apollo/subgraph';
import { installQueryField } from '@graphql-mesh/utils';
import { MapperKind, mapSchema, printSchemaWithDirectives } from '@graphql-tools/utils';
import {
  collectEntityObjectTypes,
  ensureQueryRoot,
  remirrorResolveReferences,
} from './entities.js';

/**
 * Federation `_Service` type for `Query._service { sdl }`.
 */
const ServiceType = new GraphQLObjectType({
  name: '_Service',
  fields: {
    sdl: {
      type: GraphQLString,
    },
  },
});

/**
 * Ensure Federation `Query._entities` dispatches via `@apollo/subgraph`
 * `entitiesResolver` for every `@key` / resolveReference entity type.
 */
export function ensureFederationEntitiesField(schema: GraphQLSchema): GraphQLSchema {
  schema = ensureQueryRoot(schema);
  const entityTypes = collectEntityObjectTypes(schema);
  if (!entityTypes.length) {
    return schema;
  }

  const typeMap = schema.getTypeMap() as Record<string, any>;
  let anyType = typeMap._Any as GraphQLScalarType | undefined;
  if (!anyType) {
    anyType = new GraphQLScalarType({
      name: '_Any',
      serialize: value => value,
      parseValue: value => value,
    });
    typeMap._Any = anyType;
  }

  let entityUnion = typeMap._Entity as GraphQLUnionType | undefined;
  if (!entityUnion) {
    entityUnion = new GraphQLUnionType({
      name: '_Entity',
      types: entityTypes,
      resolveType(obj) {
        return obj?.__typename || undefined;
      },
    });
    typeMap._Entity = entityUnion;
  } else {
    // Refresh member list when rebuilds left a stale empty union.
    const existing = new Set(entityUnion.getTypes().map(t => t.name));
    if (entityTypes.some(t => !existing.has(t.name))) {
      entityUnion = new GraphQLUnionType({
        name: '_Entity',
        types: entityTypes,
        resolveType(obj) {
          return obj?.__typename || undefined;
        },
      });
      typeMap._Entity = entityUnion;
    }
  }

  const entitiesResolve = (
    _root: unknown,
    args: { representations?: unknown },
    context: any,
    info: GraphQLResolveInfo,
  ) => {
    const representations = args?.representations;
    if (!Array.isArray(representations)) {
      return [];
    }
    return entitiesResolver({ representations, context, info });
  };

  schema = installQueryField(schema, '_entities', {
    type: new GraphQLNonNull(new GraphQLList(entityUnion)),
    args: {
      representations: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(anyType))),
        default: undefined,
        extensions: Object.create(null),
        defaultValue: undefined,
      } as any,
    },
    resolve: entitiesResolve,
  });
  return remirrorResolveReferences(schema);
}

/**
 * Mesh / draft-Federation directives that execute inside `buildSubgraphSchema`
 * and must not appear in Federation-facing `_service { sdl }` (Rover / Router).
 */
const SUBGRAPH_RUNTIME_DIRECTIVES = new Set([
  'transport',
  'source',
  'meshSource',
  'connect',
  'hoist',
  'merge',
  'resolveTo',
  'pubsubOperation',
  'pubsubPublish',
  'lookup',
  'is',
  'additionalField',
  'internal',
]);

function isMeshOrDraftLinkUrl(url: unknown): boolean {
  if (typeof url !== 'string') {
    return false;
  }
  return (
    url.startsWith('https://specs.graphql-mesh.dev/') ||
    url.startsWith('https://the-guild.dev/graphql/mesh/') ||
    url.startsWith('https://graphql.github.io/graphql-federation-spec/draft')
  );
}

function stripRuntimeDirectivesFromExtensions(extensions: Record<string, any> | undefined) {
  if (!extensions?.directives || typeof extensions.directives !== 'object') {
    return extensions;
  }
  const nextDirectives: Record<string, any> = { ...extensions.directives };
  for (const name of SUBGRAPH_RUNTIME_DIRECTIVES) {
    delete nextDirectives[name];
  }
  if (Array.isArray(nextDirectives.link)) {
    nextDirectives.link = nextDirectives.link.filter(
      (link: { url?: string }) => !isMeshOrDraftLinkUrl(link?.url),
    );
    if (!nextDirectives.link.length) {
      delete nextDirectives.link;
    }
  }
  return {
    ...extensions,
    directives: nextDirectives,
  };
}

function stripRuntimeDirectiveAst(astNode: any): any {
  if (!astNode?.directives?.length) {
    return astNode;
  }
  const directives = astNode.directives.filter((d: any) => !isRuntimeDirectiveAst(d));
  if (directives.length === astNode.directives.length) {
    return astNode;
  }
  return { ...astNode, directives };
}

/** True when an AST directive must not appear in Federation-facing SDL. */
function isRuntimeDirectiveAst(directive: {
  name: { value: string };
  arguments?: ReadonlyArray<{ name: { value: string }; value: any }>;
}): boolean {
  if (SUBGRAPH_RUNTIME_DIRECTIVES.has(directive.name.value)) {
    return true;
  }
  if (directive.name.value !== 'link') {
    return false;
  }
  const urlArg = directive.arguments?.find(a => a.name.value === 'url');
  const urlValue = urlArg?.value;
  const url =
    urlValue?.kind === 'StringValue'
      ? urlValue.value
      : typeof urlValue === 'string'
        ? urlValue
        : undefined;
  return isMeshOrDraftLinkUrl(url);
}

function fieldHasRuntimeDirective(
  fieldConfig: GraphQLFieldConfig<any, any>,
  name: string,
): boolean {
  const dirs = (fieldConfig.extensions as any)?.directives;
  if (dirs?.[name]?.length) {
    return true;
  }
  return !!fieldConfig.astNode?.directives?.some(d => d.name.value === name);
}

/**
 * Strip Mesh / draft runtime directives, `@lookup` / `@internal` fields/args, and
 * Federation runtime types from printed `_service` SDL while leaving them
 * executable on the live schema. Rover and Apollo Router consume this
 * Federation-facing SDL. `printSchemaWithDirectives` merges schema
 * `extensions.directives` with `astNode` / `extensionASTNodes`, so both must be
 * cleaned before print.
 */
function printSubgraphSdlForService(schema: GraphQLSchema): string {
  const filtered = mapSchema(schema, {
    [MapperKind.DIRECTIVE]: directive => {
      if (SUBGRAPH_RUNTIME_DIRECTIVES.has(directive.name)) {
        return null;
      }
      return directive;
    },
    [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, typeName) => {
      if (
        (typeName === 'Query' || schema.getQueryType()?.name === typeName) &&
        (_fieldName === '_entities' || _fieldName === '_service')
      ) {
        return null;
      }
      // `@lookup` becomes `resolveReference` / `_entities`; omit from Rover SDL
      // (same as `@internal`).
      if (
        fieldHasRuntimeDirective(fieldConfig, 'internal') ||
        fieldHasRuntimeDirective(fieldConfig, 'lookup')
      ) {
        return null;
      }
      return {
        ...fieldConfig,
        extensions: stripRuntimeDirectivesFromExtensions(fieldConfig.extensions as any),
        astNode: stripRuntimeDirectiveAst(fieldConfig.astNode),
      };
    },
    [MapperKind.ARGUMENT]: argConfig => {
      const dirs = (argConfig.extensions as any)?.directives;
      if (dirs?.internal?.length) {
        return null;
      }
      const astDirs = argConfig.astNode?.directives;
      if (astDirs?.some(d => d.name.value === 'internal')) {
        return null;
      }
      return {
        ...argConfig,
        extensions: stripRuntimeDirectivesFromExtensions(argConfig.extensions as any),
        astNode: stripRuntimeDirectiveAst(argConfig.astNode),
      };
    },
    [MapperKind.OBJECT_TYPE]: type => {
      if (type.name === '_Entity' || type.name === '_Service' || type.name === '_Any') {
        return null;
      }
      const config = type.toConfig();
      return new (Object.getPrototypeOf(type).constructor)({
        ...config,
        extensions: stripRuntimeDirectivesFromExtensions(config.extensions as any),
        astNode: stripRuntimeDirectiveAst(config.astNode),
        extensionASTNodes: config.extensionASTNodes?.map(stripRuntimeDirectiveAst),
      });
    },
    [MapperKind.INTERFACE_TYPE]: type => {
      const config = type.toConfig();
      return new (Object.getPrototypeOf(type).constructor)({
        ...config,
        extensions: stripRuntimeDirectivesFromExtensions(config.extensions as any),
        astNode: stripRuntimeDirectiveAst(config.astNode),
        extensionASTNodes: config.extensionASTNodes?.map(stripRuntimeDirectiveAst),
      });
    },
    [MapperKind.SCALAR_TYPE]: type => {
      if (type.name === '_Any') {
        return null;
      }
      return type;
    },
    [MapperKind.UNION_TYPE]: type => {
      if (type.name === '_Entity') {
        return null;
      }
      return type;
    },
  });

  // Rebuild so schema-level Mesh `@transport` / draft `@link` leave both
  // extensions and AST (printSchemaWithDirectives reads both).
  const config = filtered.toConfig();
  const federationFacing = new GraphQLSchema({
    ...config,
    extensions: stripRuntimeDirectivesFromExtensions(config.extensions as any),
    astNode: stripRuntimeDirectiveAst(config.astNode),
    extensionASTNodes: config.extensionASTNodes?.map(stripRuntimeDirectiveAst),
  });

  return printSchemaWithDirectives(federationFacing);
}

/**
 * Ensure Federation `Query._service { sdl }` for Apollo Router / Hive Gateway
 * subgraph polling.
 */
export function ensureFederationServiceField(schema: GraphQLSchema): GraphQLSchema {
  schema = ensureQueryRoot(schema);

  const typeMap = schema.getTypeMap() as Record<string, any>;
  if (!typeMap._Service) {
    typeMap._Service = ServiceType;
  }

  const serviceField: GraphQLFieldConfig<any, any> = {
    type: new GraphQLNonNull(typeMap._Service as GraphQLObjectType),
    resolve: (_root, _args, _context, info) => ({
      sdl: printSubgraphSdlForService(info.schema),
    }),
  };

  return installQueryField(schema, '_service', serviceField);
}
