import {
  getNamedType,
  GraphQLFieldConfig,
  GraphQLSchema,
  isObjectType,
  isSpecifiedScalarType,
  OperationTypeNode,
} from 'graphql';
import pluralize from 'pluralize';
import { snakeCase } from 'snake-case';
import { mergeSchemas, MergeSchemasConfig } from '@graphql-tools/schema';
import { getRootTypeMap, MapperKind, mapSchema, TypeSource } from '@graphql-tools/utils';
import { getDirectiveExtensions } from './getDirectiveExtensions.js';

export interface SubgraphConfig {
  name: string;
  schema: GraphQLSchema;
  transforms?: SubgraphTransform[];
}

export type SubgraphTransform = (
  schema: GraphQLSchema,
  subgraphConfig: SubgraphConfig,
) => GraphQLSchema;

const defaultRootTypeNames: Record<OperationTypeNode, string> = {
  query: 'Query',
  mutation: 'Mutation',
  subscription: 'Subscription',
};

export function composeSubgraphs(
  subgraphs: SubgraphConfig[],
  options?: Omit<MergeSchemasConfig, 'schema'>,
) {
  const annotatedSubgraphs: GraphQLSchema[] = [];
  let mergeDirectiveUsed = false;
  for (const subgraphConfig of subgraphs) {
    const { name: subgraphName, schema, transforms } = subgraphConfig;
    const rootTypeMap = getRootTypeMap(schema);
    const typeToOperationType = new Map<string, OperationTypeNode>();

    for (const [operationType, rootType] of rootTypeMap) {
      typeToOperationType.set(rootType.name, operationType);
    }

    const annotatedSubgraph = mapSchema(schema, {
      [MapperKind.TYPE]: type => {
        if (isSpecifiedScalarType(type)) {
          return type;
        }
        const operationType = typeToOperationType.get(type.name);
        if (operationType) {
          return new (Object.getPrototypeOf(type).constructor)({
            ...type.toConfig(),
            name: defaultRootTypeNames[operationType],
          });
        }
        const directives: Record<string, any> = {
          ...getDirectiveExtensions(type),
          source: {
            subgraph: subgraphName,
            name: type.name,
          },
        };
        return new (Object.getPrototypeOf(type).constructor)({
          ...type.toConfig(),
          extensions: {
            ...type.extensions,
            directives,
          },
        });
      },
      [MapperKind.FIELD]: (fieldConfig, fieldName) => ({
        ...fieldConfig,
        extensions: {
          ...fieldConfig.extensions,
          directives: {
            ...getDirectiveExtensions(fieldConfig),
            source: {
              subgraph: subgraphName,
              name: fieldName,
              type: fieldConfig.type.toString(),
            },
          },
        },
      }),
      [MapperKind.ENUM_VALUE]: (valueConfig, _typeName, _schema, externalValue) => ({
        ...valueConfig,
        extensions: {
          ...valueConfig.extensions,
          directives: {
            ...getDirectiveExtensions(valueConfig),
            source: {
              subgraph: subgraphName,
              name: externalValue,
            },
          },
        },
      }),
      [MapperKind.ROOT_FIELD]: (fieldConfig, fieldName) => {
        const directiveExtensions = getDirectiveExtensions(fieldConfig);
        directiveExtensions.source ||= [];
        directiveExtensions.source.push({
          subgraph: subgraphName,
          name: fieldName,
          type: fieldConfig.type.toString(),
        });
        if (!transforms?.length) {
          addAnnotationsForSemanticConventions({
            queryFieldName: fieldName,
            queryFieldConfig: fieldConfig,
            directiveExtensions,
            subgraphName,
          });
          if (directiveExtensions.merge) {
            mergeDirectiveUsed = true;
          }
        }
        return {
          ...fieldConfig,
          extensions: {
            ...fieldConfig.extensions,
            directives: directiveExtensions,
          },
        };
      },
    });

    let transformedSubgraph = annotatedSubgraph;
    if (transforms?.length) {
      for (const transform of transforms) {
        transformedSubgraph = transform(transformedSubgraph, subgraphConfig);
      }
      // Semantic conventions
      transformedSubgraph = mapSchema(transformedSubgraph, {
        [MapperKind.ROOT_FIELD]: (fieldConfig, fieldName) => {
          // Automatic type merging configuration based on ById and ByIds naming conventions after transforms
          const directiveExtensions = getDirectiveExtensions(fieldConfig);
          addAnnotationsForSemanticConventions({
            queryFieldName: fieldName,
            queryFieldConfig: fieldConfig,
            directiveExtensions,
            subgraphName,
          });
          if (directiveExtensions.merge) {
            mergeDirectiveUsed = true;
          }
          return {
            ...fieldConfig,
            extensions: {
              ...fieldConfig.extensions,
              directives: directiveExtensions,
            },
          };
        },
      });
    }
    annotatedSubgraphs.push(transformedSubgraph);
  }

  const typeDefs: TypeSource[] = [];

  if (mergeDirectiveUsed) {
    typeDefs.push(`
      directive @merge(subgraph: String!, keyField: String!, keyArg: String!) on FIELD_DEFINITION
    `);
  }

  if (options?.typeDefs) {
    typeDefs.push(options.typeDefs);
  }

  return mergeSchemas({
    assumeValidSDL: true,
    assumeValid: true,
    ...options,
    schemas: [...annotatedSubgraphs, ...(options?.schemas || [])],
    typeDefs,
  });
}

function addAnnotationsForSemanticConventions({
  queryFieldName,
  queryFieldConfig,
  directiveExtensions,
  subgraphName,
}: {
  queryFieldConfig: GraphQLFieldConfig<any, any>;
  queryFieldName: string;
  directiveExtensions: any;
  subgraphName: string;
}) {
  const type = getNamedType(queryFieldConfig.type);
  if (isObjectType(type)) {
    const fieldMap = type.getFields();
    for (const fieldName in fieldMap) {
      const objectField = fieldMap[fieldName];
      const objectFieldType = getNamedType(objectField.type);
      const [argName, arg] =
        Object.entries(queryFieldConfig.args).find(
          ([argName, arg]) =>
            getNamedType(arg.type) === objectFieldType &&
            (argName === fieldName || pluralize(fieldName) === argName),
        ) || [];
      const queryFieldNameSnakeCase = snakeCase(queryFieldName);
      const pluralTypeName = pluralize(type.name);
      if (arg) {
        switch (queryFieldNameSnakeCase) {
          case snakeCase(type.name):
          case snakeCase(`get_${type.name}_by_${fieldName}`):
          case snakeCase(`${type.name}_by_${fieldName}`): {
            directiveExtensions.merge ||= [];
            directiveExtensions.merge.push({
              subgraph: subgraphName,
              keyField: fieldName,
              keyArg: argName,
            });
            break;
          }
          case snakeCase(pluralTypeName):
          case snakeCase(`get_${pluralTypeName}_by_${fieldName}`):
          case snakeCase(`${pluralTypeName}_by_${fieldName}`):
          case snakeCase(`get_${pluralTypeName}_by_${fieldName}s`):
          case snakeCase(`${pluralTypeName}_by_${fieldName}s`): {
            directiveExtensions.merge ||= [];
            directiveExtensions.merge.push({
              subgraph: subgraphName,
              keyField: fieldName,
              keyArg: argName,
            });
            break;
          }
        }
      }
      /** For the schemas with filter in `where` argument */
      /** Todo:
      if (fieldName === 'id') {
        const [, whereArg] = Object.entries(queryFieldConfig.args).find(([argName]) => argName === 'where') || [];
        const whereArgType = whereArg && getNamedType(whereArg.type);
        const whereArgTypeFields = isInputObjectType(whereArgType) && whereArgType.getFields();
        const regularFieldInWhereArg = whereArgTypeFields?.[fieldName];
        const regularFieldTypeName =
          regularFieldInWhereArg && getNamedType(regularFieldInWhereArg.type)?.name;
        const batchFieldInWhereArg = whereArgTypeFields?.[`${fieldName}_in`];
        const batchFieldTypeName =
          batchFieldInWhereArg && getNamedType(batchFieldInWhereArg.type)?.name;
        const objectFieldTypeName = objectFieldType.name;
        if (regularFieldTypeName === objectFieldTypeName) {
          const operationName = pascalCase(`get_${type.name}_by_${fieldName}`);
          const originalFieldName = getOriginalFieldNameForSubgraph(queryField, subgraphName);
          const resolverAnnotation: ResolverAnnotation = {
            subgraph: subgraphName,
            operation: `query ${operationName}($${varName}: ${objectFieldTypeName}!) { ${originalFieldName}(where: { ${fieldName}: $${varName}) } }`,
            kind: 'FETCH',
          };
          directiveExtensions.resolver ||= [];
          directiveExtensions.resolver.push(resolverAnnotation);
          directiveExtensions.variable ||= [];
        }
        if (batchFieldTypeName === objectFieldTypeName) {
          const pluralFieldName = pluralize(fieldName);
          const operationName = pascalCase(`get_${pluralTypeName}_by_${pluralFieldName}`);
          const originalFieldName = getOriginalFieldNameForSubgraph(queryField, subgraphName);
          const resolverAnnotation: ResolverAnnotation = {
            subgraph: subgraphName,
            operation: `query ${operationName}($${varName}: [${objectFieldTypeName}!]!) { ${originalFieldName}(where: { ${fieldName}_in: $${varName} }) }`,
            kind: 'BATCH',
          };
          directiveExtensions.resolver ||= [];
          directiveExtensions.resolver.push(resolverAnnotation);
          directiveExtensions.variable ||= [];
        }
      }
      */
    }
  }
}
