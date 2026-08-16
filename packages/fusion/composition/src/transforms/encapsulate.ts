import type { GraphQLFieldConfigMap, OperationTypeNode } from 'graphql';
import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';
import { getDirectiveExtensions } from '@graphql-tools/utils';
import type { SubgraphConfig, SubgraphTransform } from '../compose.js';
import { importFederationDirectives } from '../federation-utils.js';
import { addInaccessibleDirective } from './filter-schema.js';

const OPERATION_TYPE_SUFFIX_MAP = {
  query: 'Query',
  mutation: 'Mutation',
  subscription: 'Subscription',
};

const DEFAULT_APPLY_TO = {
  query: true,
  mutation: true,
  subscription: true,
};

export interface EncapsulateTransformOpts {
  /**
   * Optional, name to use for grouping under the root types. If not specified, the API name is used.
   */
  name?: string;
  applyTo?: Record<OperationTypeNode, boolean>;
}

export function createEncapsulateTransform(opts: EncapsulateTransformOpts = {}): SubgraphTransform {
  return function encapsulateTransform(schema: GraphQLSchema, subgraphConfig: SubgraphConfig) {
    const groupName = opts.name || subgraphConfig.name;
    const applyToMap: Record<OperationTypeNode, boolean> = {
      ...DEFAULT_APPLY_TO,
      ...(opts.applyTo || {}),
    };
    const newRootTypes: Record<string, GraphQLObjectType> = {};
    let inaccessibleDirectiveAdded = false;
    for (const opTypeString in applyToMap) {
      const operationType = opTypeString as OperationTypeNode;
      const originalType = schema.getRootType(operationType);
      if (originalType && applyToMap[operationType]) {
        const originalTypeConfig = originalType.toConfig();
        const wrappedTypeName = `${groupName}${OPERATION_TYPE_SUFFIX_MAP[operationType]}`;
        const originalFieldMapWithHidden: GraphQLFieldConfigMap<any, any> = {};
        const wrappedFieldMap: GraphQLFieldConfigMap<any, any> = {};
        for (const fieldName in originalTypeConfig.fields) {
          const originalFieldConfig = originalTypeConfig.fields[fieldName];
          // Already-hidden copies from a previous encapsulate stay on the root type.
          if (fieldName.startsWith('_encapsulated_')) {
            originalFieldMapWithHidden[fieldName] = originalFieldConfig;
            continue;
          }
          const originalDirectives = getDirectiveExtensions(originalFieldConfig) || {};
          // Nested encapsulate: keep existing namespace fields as-is under the new group
          // instead of re-pointing them at an SDK field that does not exist (#4962).
          if (originalDirectives.resolveTo?.[0]?.sourceFieldName === '__typename') {
            wrappedFieldMap[fieldName] = originalFieldConfig;
            continue;
          }
          // Generate sourceArgs to forward all arguments
          const sourceArgs: Record<string, string> = {};
          if (originalFieldConfig.args) {
            for (const argName in originalFieldConfig.args) {
              sourceArgs[argName] = `{args.${argName}}`;
            }
          }
          const wrappedFieldName = `_encapsulated_${groupName}_${fieldName}`;
          wrappedFieldMap[fieldName] = {
            ...originalFieldConfig,
            extensions: {
              ...originalFieldConfig.extensions,
              directives: {
                ...originalDirectives,
                resolveTo: [
                  {
                    sourceName: subgraphConfig.name,
                    sourceTypeName: originalType.name,
                    sourceFieldName: wrappedFieldName,
                    ...(Object.keys(sourceArgs).length > 0 && { sourceArgs }),
                  },
                ],
              },
            },
          };
          const newOriginalFieldConfig = {
            ...originalFieldConfig,
            astNode: undefined,
          };
          addInaccessibleDirective(newOriginalFieldConfig);
          inaccessibleDirectiveAdded = true;
          originalFieldMapWithHidden[wrappedFieldName] = newOriginalFieldConfig;
        }
        const wrappedType = new GraphQLObjectType({
          name: wrappedTypeName,
          fields: wrappedFieldMap,
        });
        newRootTypes[operationType] = new GraphQLObjectType({
          ...originalTypeConfig,
          fields: {
            ...originalFieldMapWithHidden,
            [groupName]: {
              type: new GraphQLNonNull(wrappedType),
              extensions: {
                directives: {
                  resolveTo: [
                    {
                      sourceName: subgraphConfig.name,
                      sourceTypeName: originalType.name,
                      sourceFieldName: '__typename',
                    },
                  ],
                },
              },
            },
          },
        });
      } else {
        newRootTypes[operationType] = originalType;
      }
    }
    const schemaConfig = schema.toConfig();
    const newDirectives = [...schemaConfig.directives];
    if (!newDirectives.some(directive => directive.name === 'resolveTo')) {
      newDirectives.push(resolveToDirective);
    }
    const newSchema = new GraphQLSchema({
      ...schemaConfig,
      // Keep named types from the original schema (interface implementors, union
      // members, unused but referenced input types). `types: undefined` would
      // drop anything not reachable as a field return type, which hides
      // `implements` types from the supergraph (#8382).
      types: schemaConfig.types.filter(
        type =>
          type !== schemaConfig.query &&
          type !== schemaConfig.mutation &&
          type !== schemaConfig.subscription,
      ),
      directives: newDirectives,
      ...newRootTypes,
    });
    const schemaLevelDirectives = getDirectiveExtensions(newSchema);
    const importStatement = schemaLevelDirectives?.link?.find(
      linkDirectiveArgs =>
        linkDirectiveArgs.url?.startsWith('https://specs.apollo.dev/federation/') &&
        linkDirectiveArgs.import,
    );
    if (importStatement && inaccessibleDirectiveAdded) {
      return importFederationDirectives(newSchema, ['@inaccessible']);
    }
    return newSchema;
  };
}

export const resolveToSourceArgsScalar = new GraphQLScalarType({
  name: 'ResolveToSourceArgs',
});

export const resolveToDirective = new GraphQLDirective({
  name: 'resolveTo',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    additionalArgs: { type: resolveToSourceArgsScalar },
    filterBy: { type: GraphQLString },
    keyField: { type: GraphQLString },
    keysArg: { type: GraphQLString },
    pubsubTopic: { type: GraphQLString },
    requiredSelectionSet: { type: GraphQLString },
    result: { type: GraphQLString },
    resultType: { type: GraphQLString },
    sourceArgs: { type: resolveToSourceArgsScalar },
    sourceFieldName: { type: GraphQLString },
    sourceName: { type: GraphQLString },
    sourceSelectionSet: { type: GraphQLString },
    sourceTypeName: { type: GraphQLString },
    valueKeyField: { type: GraphQLString },
  },
});
