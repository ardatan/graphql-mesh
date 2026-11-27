import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
  GraphQLUnionType,
  isObjectType,
  type GraphQLFieldConfig,
  type GraphQLObjectType as GraphQLObjectTypeType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
} from 'graphql';
import { entitiesResolver } from '@apollo/subgraph';
import { installQueryField } from '@graphql-mesh/utils';
import { MapperKind, mapSchema, printSchemaWithDirectives } from '@graphql-tools/utils';
import { getTypeResolveReference } from './lookup.js';

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

function collectEntityTypes(schema: GraphQLSchema): GraphQLObjectTypeType[] {
  return Object.values(schema.getTypeMap()).filter(
    (t): t is GraphQLObjectTypeType =>
      isObjectType(t) && !t.name.startsWith('__') && !!getTypeResolveReference(t),
  );
}

/**
 * Ensure Federation `Query._entities` dispatches via `@apollo/subgraph`
 * `entitiesResolver` for every type that has a `resolveReference`.
 */
export function ensureFederationEntitiesField(schema: GraphQLSchema): GraphQLSchema {
  const queryType = schema.getQueryType();
  if (!queryType) {
    return schema;
  }
  const entityTypes = collectEntityTypes(schema);
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

  return installQueryField(schema, '_entities', {
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
}

/**
 * Strip Federation Spec `@internal` fields/args from printed `_service` SDL
 * while leaving them executable on the live schema.
 */
function printSubgraphSdlForService(schema: GraphQLSchema): string {
  const filtered = mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig, _fieldName, typeName) => {
      if (typeName === 'Query' && (_fieldName === '_entities' || _fieldName === '_service')) {
        return null;
      }
      const dirs = (fieldConfig.extensions as any)?.directives;
      if (dirs?.internal?.length) {
        return null;
      }
      const astDirs = fieldConfig.astNode?.directives;
      if (astDirs?.some(d => d.name.value === 'internal')) {
        return null;
      }
      return fieldConfig;
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
      return argConfig;
    },
    [MapperKind.OBJECT_TYPE]: type => {
      if (type.name === '_Entity' || type.name === '_Service' || type.name === '_Any') {
        return null;
      }
      return type;
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
  return printSchemaWithDirectives(filtered);
}

/**
 * Ensure Federation `Query._service { sdl }` for Apollo Router / Hive Gateway
 * subgraph polling.
 */
export function ensureFederationServiceField(schema: GraphQLSchema): GraphQLSchema {
  const queryType = schema.getQueryType();
  if (!queryType) {
    return schema;
  }

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
