import {
  getNamedType,
  GraphQLField,
  GraphQLNamedType,
  GraphQLSchema,
  isObjectType,
  isSpecifiedScalarType,
  OperationTypeNode,
} from 'graphql';
import { pascalCase } from 'pascal-case';
import { snakeCase } from 'snake-case';
import { mergeSchemas, MergeSchemasConfig } from '@graphql-tools/schema';
import { asArray, getRootTypeMap, getRootTypes, MapperKind, mapSchema } from '@graphql-tools/utils';
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

type ResolverAnnotation = {
  subgraph: string;
  operation: string;
  kind: 'BATCH' | 'FETCH';
};

type VariableAnnotation = {
  subgraph: string;
  name: string;
  select: string;
};

export function composeSubgraphs(
  subgraphs: SubgraphConfig[],
  options?: Omit<MergeSchemasConfig, 'schema'>,
) {
  const annotatedSubgraphs: GraphQLSchema[] = [];
  const transformedSubgraphMap = new Map<string, GraphQLSchema>();
  for (const subgraphConfig of subgraphs) {
    const { name: subgraphName, schema, transforms } = subgraphConfig;
    const rootTypeMap = getRootTypeMap(schema);
    const typeToOperationType = new Map<string, OperationTypeNode>();

    for (const [operationType, rootType] of rootTypeMap) {
      typeToOperationType.set(rootType.name, operationType);
    }

    const queryType = schema.getQueryType();
    const queryFields = queryType?.getFields();

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
        // Automatic type merging configuration based on ById and ByIds naming conventions before transforms
        addAnnotationsForSemanticConventions({
          type,
          queryFields,
          subgraphName,
          directives,
          subgraphs,
          transformedSubgraphMap,
        });
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
      [MapperKind.ROOT_FIELD]: (fieldConfig, fieldName, typeName) => {
        const operationType = typeToOperationType.get(typeName);
        const operationName =
          operationType === 'query' ? fieldName : `${operationType}${fieldName}`;
        const variableDefinitions: string[] = [];
        const rootFieldArgs: string[] = [];
        if (fieldConfig.args) {
          for (const argName in fieldConfig.args) {
            const arg = fieldConfig.args[argName];
            let variableDefinitionStr = `$${argName}: ${arg.type}`;
            if (arg.defaultValue) {
              variableDefinitionStr += ` = ${
                typeof arg.defaultValue === 'string'
                  ? JSON.stringify(arg.defaultValue)
                  : arg.defaultValue
              }`;
            }
            variableDefinitions.push(variableDefinitionStr);
            rootFieldArgs.push(`${argName}: $${argName}`);
          }
        }
        const variableDefinitionsString = variableDefinitions.length
          ? `(${variableDefinitions.join(', ')})`
          : '';
        const rootFieldArgsString = rootFieldArgs.length ? `(${rootFieldArgs.join(', ')})` : '';
        const operationString = `${operationType} ${operationName}${variableDefinitionsString} { ${fieldName}${rootFieldArgsString} }`;

        return {
          ...fieldConfig,
          extensions: {
            ...fieldConfig.extensions,
            directives: {
              ...getDirectiveExtensions(fieldConfig),
              resolver: {
                subgraph: subgraphName,
                operation: operationString,
              },
              source: {
                subgraph: subgraphName,
                name: fieldName,
                type: fieldConfig.type.toString(),
              },
            },
          },
        };
      },
    });

    let transformedSubgraph = annotatedSubgraph;
    transformedSubgraphMap.set(subgraphName, transformedSubgraph);
    if (transforms?.length) {
      for (const transform of transforms) {
        transformedSubgraph = transform(transformedSubgraph, subgraphConfig);
        transformedSubgraphMap.set(subgraphName, transformedSubgraph);
      }
      // Semantic conventions
      const transformedQueryType = transformedSubgraph.getQueryType();
      const transformedQueryFields = transformedQueryType?.getFields();
      const rootTypes = getRootTypes(transformedSubgraph);
      transformedSubgraph = mapSchema(transformedSubgraph, {
        [MapperKind.TYPE]: type => {
          if (isSpecifiedScalarType(type) || rootTypes.has(type as any)) {
            return type;
          }
          const directives = getDirectiveExtensions(type);
          // Automatic type merging configuration based on ById and ByIds naming conventions after transforms
          addAnnotationsForSemanticConventions({
            type,
            queryFields: transformedQueryFields,
            subgraphName,
            directives,
            subgraphs,
            transformedSubgraphMap,
          });
          return new (Object.getPrototypeOf(type).constructor)({
            ...type.toConfig(),
            extensions: {
              ...type.extensions,
              directives,
            },
          });
        },
      });
    }
    annotatedSubgraphs.push(transformedSubgraph);
    transformedSubgraphMap.set(subgraphName, transformedSubgraph);
  }

  return mergeSchemas({
    schemas: annotatedSubgraphs,
    assumeValidSDL: true,
    assumeValid: true,
    ...options,
  });
}

function addAnnotationsForSemanticConventions({
  type,
  queryFields,
  subgraphName,
  directives,
  subgraphs,
  transformedSubgraphMap,
}: {
  type: GraphQLNamedType;
  queryFields?: Record<string, GraphQLField<any, any>>;
  subgraphName: string;
  directives: Record<string, any>;
  subgraphs: SubgraphConfig[];
  transformedSubgraphMap: Map<string, GraphQLSchema>;
}) {
  if (queryFields && isObjectType(type)) {
    const fieldMap = type.getFields();
    for (const queryFieldName in queryFields) {
      for (const fieldName in fieldMap) {
        const objectField = fieldMap[fieldName];
        const queryField = queryFields[queryFieldName];
        const arg = queryField.args.find(
          arg => getNamedType(arg.type) === getNamedType(objectField.type),
        );
        const queryFieldTypeName = getNamedType(queryField.type).name;
        const queryFieldNameSnakeCase = snakeCase(queryFieldName);
        const varName = `${type.name}_${fieldName}`;
        if (arg && queryFieldTypeName === type.name) {
          // eslint-disable-next-line no-inner-declarations
          function addVariablesForOtherSubgraphs() {
            directives.variable ||= [];
            for (const otherSubgraphConfig of subgraphs) {
              const otherType = otherSubgraphConfig.schema.getType(type.name);
              const otherTransformedType = transformedSubgraphMap
                .get(otherSubgraphConfig.name)
                ?.getType(type.name);
              const otherTypeFieldNames = [];
              if (isObjectType(otherType)) {
                otherTypeFieldNames.push(...Object.keys(otherType.getFields()));
              }
              if (isObjectType(otherTransformedType)) {
                otherTypeFieldNames.push(...Object.keys(otherTransformedType.getFields()));
              }
              if (otherTypeFieldNames.includes(fieldName)) {
                directives.variable ||= [];
                if (
                  !directives.variable.some(
                    (v: VariableAnnotation) =>
                      v.subgraph === otherSubgraphConfig.name && v.name === varName,
                  )
                ) {
                  directives.variable.push({
                    subgraph: otherSubgraphConfig.name,
                    name: varName,
                    select: fieldName,
                  });
                }
              }
            }
          }
          switch (queryFieldNameSnakeCase) {
            case snakeCase(type.name):
            case snakeCase(`get_${type.name}_by_${fieldName}`):
            case snakeCase(`${type.name}_by_${fieldName}`): {
              const operationName = pascalCase(`${type.name}_by_${fieldName}`);
              const originalFieldName = getOriginalFieldNameForSubgraph(queryField, subgraphName);
              const resolverAnnotation: ResolverAnnotation = {
                subgraph: subgraphName,
                operation: `query ${operationName}($${varName}: ${arg.type}) { ${originalFieldName}(${arg.name}: $${varName}) }`,
                kind: 'FETCH',
              };
              directives.resolver ||= [];
              directives.resolver.push(resolverAnnotation);
              addVariablesForOtherSubgraphs();
              break;
            }
            case snakeCase(`${type.name}s`):
            case snakeCase(`get_${type.name}s_by_${fieldName}`):
            case snakeCase(`${type.name}s_by_${fieldName}`):
            case snakeCase(`get_${type.name}s_by_${fieldName}s`):
            case snakeCase(`${type.name}s_by_${fieldName}s`): {
              const operationName = pascalCase(`${type.name}s_by_${fieldName}s`);
              const originalFieldName =
                getOriginalFieldNameForSubgraph(queryField, subgraphName) || queryFieldName;
              const resolverAnnotation: ResolverAnnotation = {
                subgraph: subgraphName,
                operation: `query ${operationName}($${varName}: ${arg.type}) { ${originalFieldName}(${arg.name}: $${varName}) }`,
                kind: 'BATCH',
              };
              directives.resolver ||= [];
              directives.resolver.push(resolverAnnotation);
              directives.variable ||= [];
              addVariablesForOtherSubgraphs();
              break;
            }
          }
        }
      }
    }
  }
}

function getOriginalFieldNameForSubgraph(
  field: GraphQLField<any, any>,
  subgraph: string,
): string | void {
  if (field.extensions?.directives) {
    const sourceDirectives = asArray((field.extensions.directives as any).source);
    const sourceDirective = sourceDirectives.find((d: any) => d.subgraph === subgraph);
    if (sourceDirective) {
      return sourceDirective.name;
    }
  }
  return field.name;
}
