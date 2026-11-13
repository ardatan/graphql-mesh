import {
  getNamedType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLUnionType,
  isInterfaceType,
  isObjectType,
  isUnionType,
  type GraphQLField,
  type GraphQLObjectType,
  type GraphQLSchema,
} from 'graphql';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import type { DirectiveArgsMap } from '../directives.js';

/**
 * Wire Federation `resolveReference` from `@entitySetByIdentifier` Query fields and
 * add `Query._entities`, so Hive can resolve entities without Mesh `@merge`.
 * Same idea as REST Connectors' `ensureFederationEntitiesField`.
 */
export function ensureODataFederationEntities(schema: GraphQLSchema): GraphQLSchema {
  const queryType = schema.getQueryType();
  if (!queryType) {
    return schema;
  }

  for (const field of Object.values(queryType.getFields())) {
    const fieldDirectives = getDirectiveExtensions<DirectiveArgsMap>(field);
    const byId = fieldDirectives?.entitySetByIdentifier?.[0];
    if (!byId?.identifierFieldName || typeof field.resolve !== 'function') {
      continue;
    }
    const namedReturn = getNamedType(field.type);
    const wire = (objType: GraphQLObjectType) => {
      if (typeof (objType as { resolveReference?: unknown }).resolveReference === 'function') {
        return;
      }
      const identifierFieldName = byId.identifierFieldName;
      const resolve = field.resolve!;
      (objType as { resolveReference?: GraphQLField<any, any>['resolve'] }).resolveReference = (
        reference,
        context,
        info,
      ) => {
        const args: Record<string, unknown> = {
          [identifierFieldName]: reference?.[identifierFieldName],
        };
        return resolve(null, args, context, info);
      };
    };

    if (isObjectType(namedReturn)) {
      wire(namedReturn);
    } else if (isInterfaceType(namedReturn) || isUnionType(namedReturn)) {
      for (const t of schema.getPossibleTypes(namedReturn)) {
        if (isObjectType(t)) {
          wire(t);
        }
      }
    }
  }

  ensureFederationEntitiesField(schema);
  return schema;
}

/**
 * Add Federation `Query._entities` that dispatches to type `resolveReference`.
 */
function ensureFederationEntitiesField(schema: GraphQLSchema) {
  const queryType = schema.getQueryType();
  if (!queryType) {
    return;
  }
  const queryFields = queryType.getFields();
  if (queryFields._entities) {
    return;
  }
  const entityTypes = Object.values(schema.getTypeMap()).filter(
    (t): t is GraphQLObjectType =>
      isObjectType(t) &&
      !t.name.startsWith('__') &&
      typeof (t as { resolveReference?: unknown }).resolveReference === 'function',
  );
  if (!entityTypes.length) {
    return;
  }

  const typeMap = schema.getTypeMap() as Record<string, unknown>;
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
        return (obj as { __typename?: string })?.__typename || undefined;
      },
    });
    typeMap._Entity = entityUnion;
  }

  queryFields._entities = {
    name: '_entities',
    description: 'Federation entity resolver for OData transport (Hive `_entities` path)',
    type: new GraphQLNonNull(new GraphQLList(entityUnion)),
    args: [
      {
        name: 'representations',
        description: undefined,
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(anyType))),
        defaultValue: undefined,
        deprecationReason: undefined,
        extensions: {},
        astNode: undefined,
      },
    ],
    resolve(_root, args, context, info) {
      const representations = args?.representations;
      if (!Array.isArray(representations)) {
        return [];
      }
      return representations.map(async (representation: any) => {
        const typeName = representation?.__typename;
        if (!typeName) {
          return representation;
        }
        const type = info.schema.getType(typeName);
        if (!isObjectType(type)) {
          return representation;
        }
        const resolveReference = (type as { resolveReference?: Function }).resolveReference;
        if (typeof resolveReference !== 'function') {
          return representation;
        }
        const resolved = await resolveReference(representation, context, info);
        if (resolved && typeof resolved === 'object' && !resolved.__typename) {
          resolved.__typename = typeName;
        }
        return resolved ?? representation;
      });
    },
    subscribe: undefined,
    deprecationReason: undefined,
    extensions: {},
    astNode: undefined,
  };
}
