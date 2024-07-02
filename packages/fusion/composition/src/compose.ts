import {
  buildSchema,
  concatAST,
  getNamedType,
  GraphQLArgumentConfig,
  GraphQLEnumType,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLNamedType,
  GraphQLSchema,
  GraphQLUnionType,
  isObjectType,
  isSpecifiedScalarType,
  parse,
  print,
} from 'graphql';
import pluralize from 'pluralize';
import { snakeCase } from 'snake-case';
import { getDirectiveExtensions } from '@graphql-mesh/utils';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import {
  Constructor,
  FieldMapper,
  getDocumentNodeFromSchema,
  MapperKind,
  mapSchema,
  printSchemaWithDirectives,
} from '@graphql-tools/utils';
import { composeServices, ServiceDefinition } from '@theguild/federation-composition';
import {
  convertSubgraphToFederationv2,
  detectAndAddMeshDirectives,
  importMeshDirectives,
} from './federation-utils.js';

export interface SubgraphConfig {
  name: string;
  schema: GraphQLSchema;
  isFederation?: boolean;
  transforms?: SubgraphTransform[];
}

export type SubgraphTransform = (
  schema: GraphQLSchema,
  subgraphConfig: SubgraphConfig,
) => GraphQLSchema;

export interface GetMeshFederationTypeDefsForDirectivesOpts {
  meshDirectiveNames?: string[];
  federationDirectiveNames?: string[];
  federationVersion?: string;
}

export function getUnifiedGraphGracefully(subgraphs: SubgraphConfig[]) {
  const result = composeSubgraphs(subgraphs);
  if (result.errors?.length) {
    throw new AggregateError(
      result.errors,
      `Failed to compose subgraphs; \n${result.errors.map(e => `- ${e.message}`).join('\n')}`,
    );
  }
  return result.supergraphSdl;
}

export function getAnnotatedSubgraphs(
  subgraphs: SubgraphConfig[],
  options: GetAnnotatedSubgraphsOptions = {},
) {
  const annotatedSubgraphs: ServiceDefinition[] = [];
  for (const subgraphConfig of subgraphs) {
    const { name: subgraphName, schema, transforms } = subgraphConfig;
    let url: string;
    const subgraphSchemaExtensions = getDirectiveExtensions(schema);
    const transportDirectives = subgraphSchemaExtensions?.transport;
    if (transportDirectives?.length) {
      url = transportDirectives[0].location;
    }

    let mergeDirectiveUsed = false;
    const sourceDirectiveUsed = transforms?.length > 0;
    const annotatedSubgraph = mapSchema(schema, {
      [MapperKind.TYPE]: type => {
        if (!sourceDirectiveUsed || isSpecifiedScalarType(type)) {
          return type;
        }
        const existingDirectives = getDirectiveExtensions(type);
        const existingSourceDirectives = existingDirectives?.source || [];
        if (existingSourceDirectives.length > 1) {
          throw new Error(
            `Type ${type.name} already has source directives from multiple subgraphs: ${existingSourceDirectives
              .map((source: any) => source.subgraph)
              .join(', ')}`,
          );
        }
        const existingSourceDirective = existingSourceDirectives[0] || {};
        const directives: Record<string, any> = {
          ...existingDirectives,
          source: {
            name: type.name,
            ...existingSourceDirective,
            subgraph: subgraphName,
          },
        };
        return new (Object.getPrototypeOf(type).constructor)({
          ...type.toConfig(),
          extensions: {
            ...type.extensions,
            directives,
          },
          astNode: undefined,
        });
      },
      [MapperKind.FIELD]: (fieldConfig, fieldName) => {
        if (!sourceDirectiveUsed) {
          return fieldConfig;
        }
        const newArgs: GraphQLFieldConfigArgumentMap = {};
        if ('args' in fieldConfig && fieldConfig.args) {
          for (const argName in fieldConfig.args) {
            const arg = fieldConfig.args[argName];
            const directives = getDirectiveExtensions(arg);
            const existingSourceDirectives = directives.source || [];
            if (existingSourceDirectives.length > 1) {
              throw new Error(
                `Argument ${argName} of field ${fieldName} already has source directives from multiple subgraphs: ${existingSourceDirectives
                  .map((source: any) => source.subgraph)
                  .join(', ')}`,
              );
            }
            const existingSourceDirective = existingSourceDirectives[0] || {};
            newArgs[argName] = {
              ...arg,
              extensions: {
                ...arg.extensions,
                directives: {
                  ...directives,
                  source: {
                    name: argName,
                    type: arg.type.toString(),
                    ...existingSourceDirective,
                    subgraph: subgraphName,
                  },
                },
              },
              astNode: undefined,
            };
          }
        }
        const existingDirectives = getDirectiveExtensions(fieldConfig);
        const existingSourceDirectives = existingDirectives.source || [];
        if (existingSourceDirectives.length > 1) {
          throw new Error(
            `Field ${fieldName} already has source directives from multiple subgraphs: ${existingSourceDirectives
              .map((source: any) => source.subgraph)
              .join(', ')}`,
          );
        }
        const existingSourceDirective = existingSourceDirectives[0] || {};
        return {
          ...fieldConfig,
          args: newArgs,
          extensions: {
            ...fieldConfig.extensions,
            directives: {
              ...existingDirectives,
              source: {
                name: fieldName,
                type: fieldConfig.type.toString(),
                ...existingSourceDirective,
                subgraph: subgraphName,
              },
            },
          },
          astNode: undefined,
        };
      },
      [MapperKind.ENUM_VALUE]: (valueConfig, _typeName, _schema, externalValue) => {
        if (!sourceDirectiveUsed) {
          return valueConfig;
        }
        const existingDirectives = getDirectiveExtensions(valueConfig);
        const existingSourceDirectives = existingDirectives.source || [];
        if (existingSourceDirectives.length > 1) {
          throw new Error(
            `Enum value ${externalValue} already has source directives from multiple subgraphs: ${existingSourceDirectives
              .map((source: any) => source.subgraph)
              .join(', ')}`,
          );
        }
        const existingSourceDirective = existingSourceDirectives[0] || {};
        return {
          ...valueConfig,
          extensions: {
            ...valueConfig.extensions,
            directives: {
              ...existingDirectives,
              source: {
                name: externalValue,
                ...existingSourceDirective,
                subgraph: subgraphName,
              },
            },
          },
          astNode: undefined,
        };
      },
      [MapperKind.ROOT_FIELD]: (fieldConfig, fieldName) => {
        const directiveExtensions = getDirectiveExtensions(fieldConfig);
        if (!transforms?.length && !options.ignoreSemanticConventions) {
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
            astNode: undefined,
          };
        }
        const newArgs: GraphQLFieldConfigArgumentMap = {};
        if (fieldConfig.args) {
          for (const argName in fieldConfig.args) {
            const arg = fieldConfig.args[argName];
            const directives = getDirectiveExtensions(arg);
            const existingSourceDirectives = directives.source || [];
            if (existingSourceDirectives.length > 1) {
              throw new Error(
                `Argument ${argName} of field ${fieldName} already has source directives from multiple subgraphs: ${existingSourceDirectives
                  .map((source: any) => source.subgraph)
                  .join(', ')}`,
              );
            }
            const existingSourceDirective = existingSourceDirectives[0] || {};
            newArgs[argName] = {
              ...arg,
              extensions: {
                ...arg.extensions,
                directives: {
                  ...directives,
                  source: {
                    name: argName,
                    type: arg.type.toString(),
                    ...existingSourceDirective,
                    subgraph: subgraphName,
                  },
                },
              },
              astNode: undefined,
            };
          }
        }
        const existingSourceDirectives = directiveExtensions.source || [];
        if (existingSourceDirectives.length > 1) {
          throw new Error(
            `Field ${fieldName} already has source directives from multiple subgraphs: ${existingSourceDirectives
              .map((source: any) => source.subgraph)
              .join(', ')}`,
          );
        }
        const existingSourceDirective = existingSourceDirectives[0] || {};
        return {
          ...fieldConfig,
          extensions: {
            ...fieldConfig.extensions,
            directives: {
              ...directiveExtensions,
              source: {
                name: fieldName,
                type: fieldConfig.type.toString(),
                ...existingSourceDirective,
                subgraph: subgraphName,
              },
            },
          },
          args: newArgs,
          astNode: undefined,
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
          if (!options.ignoreSemanticConventions) {
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
              astNode: undefined,
            };
          }
        },
      });
    }
    transformedSubgraph = convertSubgraphToFederationv2(transformedSubgraph);
    transformedSubgraph = detectAndAddMeshDirectives(transformedSubgraph);
    const importedDirectives = new Set<string>();
    if (mergeDirectiveUsed) {
      importedDirectives.add('@merge');
    }
    if (sourceDirectiveUsed) {
      importedDirectives.add('@source');
    }
    const fieldMapper: FieldMapper = (fieldConfig, fieldName) => {
      const fieldDirectives = getDirectiveExtensions(fieldConfig);
      const sourceDirectives = fieldDirectives?.source;
      if (sourceDirectives?.length) {
        const filteredSourceDirectives = sourceDirectives.filter(
          sourceDirective =>
            sourceDirective.name !== fieldName ||
            sourceDirective.type !== fieldConfig.type.toString(),
        );
        fieldDirectives.source = filteredSourceDirectives;
      }
      if ('args' in fieldConfig) {
        const newArgs: GraphQLFieldConfigArgumentMap = {};
        for (const argName in fieldConfig.args) {
          const arg = fieldConfig.args[argName];
          const argDirectives = getDirectiveExtensions(arg);
          const sourceDirectives = argDirectives?.source;
          if (sourceDirectives?.length) {
            const filteredSourceDirectives = sourceDirectives.filter(
              sourceDirective =>
                sourceDirective.name !== argName || sourceDirective.type !== arg.type.toString(),
            );
            newArgs[argName] = {
              ...arg,
              extensions: {
                ...arg.extensions,
                directives: {
                  ...argDirectives,
                  source: filteredSourceDirectives,
                },
              },
            };
          } else {
            newArgs[argName] = arg;
          }
        }
        return {
          ...fieldConfig,
          args: newArgs,
          extensions: {
            ...fieldConfig.extensions,
            directives: fieldDirectives,
          },
          astNode: undefined,
        };
      }
      return {
        ...fieldConfig,
        extensions: {
          ...fieldConfig.extensions,
          directives: fieldDirectives,
        },
        astNode: undefined,
      };
    };
    // Remove unnecessary @source directives
    transformedSubgraph = mapSchema(transformedSubgraph, {
      [MapperKind.TYPE]: type => {
        const typeDirectives = getDirectiveExtensions(type);
        const sourceDirectives = typeDirectives?.source;
        if (sourceDirectives?.length) {
          const filteredSourceDirectives = sourceDirectives.filter(
            sourceDirective => sourceDirective.name !== type.name,
          );
          const typeExtensions: Record<string, any> = (type.extensions ||= {});
          typeExtensions.directives = {
            ...typeDirectives,
            source: filteredSourceDirectives,
          };
        }
        return type;
      },
      [MapperKind.ROOT_FIELD]: fieldMapper,
      [MapperKind.FIELD]: fieldMapper as any,
      [MapperKind.ENUM_VALUE]: (valueConfig, _typeName, _schema, externalValue) => {
        const valueDirectives = getDirectiveExtensions(valueConfig);
        const sourceDirectives = valueDirectives?.source;
        if (sourceDirectives?.length) {
          const filteredSourceDirectives = sourceDirectives.filter(
            sourceDirective => sourceDirective.name !== externalValue,
          );
          const valueExtensions: Record<string, any> = (valueConfig.extensions ||= {});
          valueExtensions.directives = {
            ...valueDirectives,
            source: filteredSourceDirectives,
          };
        }
        return valueConfig;
      },
    });
    // Workaround to keep directives on unsupported nodes since not all of them are supported by the composition library
    const extraTypeDirectivesMap = new Map<string, Record<string, any[]>>();
    function saveDirectives<T extends GraphQLNamedType>(type: T, TypeCtor: Constructor<T>) {
      const typeConfig = type.toConfig();

      const directiveExtensions = getDirectiveExtensions(type);
      if (directiveExtensions && Object.keys(directiveExtensions).length) {
        extraTypeDirectivesMap.set(type.name, directiveExtensions);

        // Cleanup directives
        return new TypeCtor({
          ...typeConfig,
          extensions: {
            ...typeConfig.extensions,
            directives: undefined,
          },
          astNode: undefined,
        });
      }

      return type;
    }
    const extraEnumValueDirectivesMap = new Map<string, Map<string, Record<string, any[]>>>();
    transformedSubgraph = mapSchema(transformedSubgraph, {
      [MapperKind.UNION_TYPE]: type => saveDirectives(type, GraphQLUnionType),
      [MapperKind.ENUM_TYPE]: type => saveDirectives(type, GraphQLEnumType),
      [MapperKind.ENUM_VALUE]: (valueConfig, typeName, _, externalValue) => {
        const enumValueDirectives = getDirectiveExtensions(valueConfig);

        if (enumValueDirectives && Object.keys(enumValueDirectives).length) {
          let enumValueDirectivesMap = extraEnumValueDirectivesMap.get(typeName);
          if (!enumValueDirectivesMap) {
            enumValueDirectivesMap = new Map<string, Record<string, any[]>>();
            extraEnumValueDirectivesMap.set(typeName, enumValueDirectivesMap);
          }
          enumValueDirectivesMap.set(externalValue, enumValueDirectives);

          // Cleanup directives
          return {
            ...valueConfig,
            extensions: {
              ...valueConfig.extensions,
              directives: undefined,
            },
            astNode: undefined,
          };
        }
      },
    });
    let extraSchemaDefinitionDirectives: Record<string, any> | undefined;
    const schemaDirectiveExtensions = getDirectiveExtensions(transformedSubgraph);
    if (schemaDirectiveExtensions) {
      const schemaDirectiveExtensionsEntries = Object.entries(schemaDirectiveExtensions);
      const schemaDirectiveExtraEntries = schemaDirectiveExtensionsEntries.filter(
        ([dirName]) => dirName !== 'link' && dirName !== 'composeDirective',
      );
      if (schemaDirectiveExtraEntries.length) {
        transformedSubgraph = new GraphQLSchema({
          ...transformedSubgraph.toConfig(),
          extensions: {
            ...transformedSubgraph.extensions,
            directives: {
              link: schemaDirectiveExtensions.link || [],
              composeDirective: schemaDirectiveExtensions.composeDirective || [],
            },
          },
          // Cleanup AST Node to avoid conflicts with extensions
          astNode: undefined,
        });
        extraSchemaDefinitionDirectives = Object.fromEntries(schemaDirectiveExtraEntries);
      }
    }

    const importedDirectivesAST = new Set<string>();
    if (mergeDirectiveUsed) {
      if (!transformedSubgraph.getDirective('merge')) {
        const { mergeDirectiveTypeDefs } = stitchingDirectives();
        // Add subgraph argument to @merge directive
        importedDirectivesAST.add(
          mergeDirectiveTypeDefs
            .replace('@merge(', '@merge(subgraph: String, ')
            .replace('on ', 'repeatable on '),
        );
      }
    }
    if (sourceDirectiveUsed) {
      importedDirectivesAST.add(/* GraphQL */ `
        scalar _HoistConfig
      `);
      importedDirectivesAST.add(/* GraphQL */ `
        directive @source(
          name: String!
          type: String
          subgraph: String!
          hoist: _HoistConfig
        ) repeatable on SCALAR | OBJECT | FIELD_DEFINITION | ARGUMENT_DEFINITION | INTERFACE | UNION | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
      `);
    }

    const queryType = transformedSubgraph.getQueryType();
    const queryTypeDirectives = getDirectiveExtensions(queryType) || {};
    if (extraTypeDirectivesMap.size) {
      importedDirectives.add('@extraTypeDirective');
      importedDirectivesAST.add(/* GraphQL */ `
        scalar _DirectiveExtensions
      `);
      importedDirectivesAST.add(/* GraphQL */ `
        directive @extraTypeDirective(
          name: String!
          directives: _DirectiveExtensions
        ) repeatable on OBJECT
      `);
      queryTypeDirectives.extraTypeDirective ||= [];
      for (const [typeName, directives] of extraTypeDirectivesMap.entries()) {
        queryTypeDirectives.extraTypeDirective.push({
          name: typeName,
          directives,
        });
      }
    }

    if (extraSchemaDefinitionDirectives) {
      importedDirectives.add('@extraSchemaDefinitionDirective');
      importedDirectivesAST.add(/* GraphQL */ `
        scalar _DirectiveExtensions
      `);
      importedDirectivesAST.add(/* GraphQL */ `
        directive @extraSchemaDefinitionDirective(
          directives: _DirectiveExtensions
        ) repeatable on OBJECT
      `);
      queryTypeDirectives.extraSchemaDefinitionDirective ||= [];
      queryTypeDirectives.extraSchemaDefinitionDirective.push({
        directives: extraSchemaDefinitionDirectives,
      });
    }

    if (extraEnumValueDirectivesMap.size) {
      importedDirectives.add('@extraEnumValueDirective');
      importedDirectivesAST.add(/* GraphQL */ `
        scalar _DirectiveExtensions
      `);
      importedDirectivesAST.add(/* GraphQL */ `
        directive @extraEnumValueDirective(
          name: String!
          value: String!
          directives: _DirectiveExtensions
        ) repeatable on OBJECT
      `);
      queryTypeDirectives.extraEnumValueDirective ||= [];
      for (const [typeName, enumValueDirectivesMap] of extraEnumValueDirectivesMap) {
        for (const [enumValueName, directives] of enumValueDirectivesMap) {
          queryTypeDirectives.extraEnumValueDirective.push({
            name: typeName,
            value: enumValueName,
            directives,
          });
        }
      }
    }

    const queryTypeExtensions: Record<string, unknown> = (queryType.extensions ||= {});
    queryTypeExtensions.directives = queryTypeDirectives;

    if (importedDirectives.size) {
      transformedSubgraph = importMeshDirectives(transformedSubgraph, [...importedDirectives]);
    }

    let subgraphAST = getDocumentNodeFromSchema(transformedSubgraph);
    if (importedDirectivesAST.size) {
      subgraphAST = concatAST([
        subgraphAST,
        parse([...importedDirectivesAST].join('\n'), { noLocation: true }),
      ]);
    }

    annotatedSubgraphs.push({
      name: subgraphName,
      typeDefs: subgraphAST,
      url,
    });
  }

  return annotatedSubgraphs;
}

export interface GetAnnotatedSubgraphsOptions {
  /**
   * If set to true, the composition will ignore the semantic conventions and will not add any automatic type merging configuration based on ById and ByIds naming conventions.
   *
   * @default false
   */
  ignoreSemanticConventions?: boolean;
}

export type ComposeSubgraphsOptions = GetAnnotatedSubgraphsOptions;

export function composeSubgraphs(
  subgraphs: SubgraphConfig[],
  options: ComposeSubgraphsOptions = {},
) {
  const annotatedSubgraphs = getAnnotatedSubgraphs(subgraphs, options);
  const composedSupergraphWithAnnotatedSubgraphs = composeAnnotatedSubgraphs(annotatedSubgraphs);
  return {
    ...composedSupergraphWithAnnotatedSubgraphs,
    subgraphs,
  };
}

export function composeAnnotatedSubgraphs(annotatedSubgraphs: ServiceDefinition[]) {
  const composedSupergraphSdl = composeServices(annotatedSubgraphs);
  return {
    ...composedSupergraphSdl,
    annotatedSubgraphs,
  };
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
  if (directiveExtensions.merge?.length) {
    return;
  }
  const type = getNamedType(queryFieldConfig.type);
  if (isObjectType(type)) {
    const fieldMap = type.getFields();
    for (const fieldName in fieldMap) {
      const objectField = fieldMap[fieldName];
      const objectFieldType = getNamedType(objectField.type);
      const argEntries = Object.entries(queryFieldConfig.args);
      let argName: string;
      let arg: GraphQLArgumentConfig;
      if (argEntries.length === 1) {
        const argType = getNamedType(argEntries[0][1].type);
        if (argType.name === objectFieldType.name) {
          [argName, arg] = argEntries[0];
        }
      } else {
        for (const [currentArgName, currentArg] of argEntries) {
          if (currentArgName === fieldName || pluralize(fieldName) === currentArgName) {
            argName = currentArgName;
            arg = currentArg;
            break;
          }
        }
      }
      const queryFieldNameSnakeCase = snakeCase(queryFieldName);
      const pluralTypeName = pluralize(type.name);
      if (arg) {
        const typeDirectives = getDirectiveExtensions(type);
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
            typeDirectives.key ||= [];
            if (!typeDirectives.key.some((key: any) => key.fields === fieldName)) {
              typeDirectives.key.push({
                fields: fieldName,
              });
              const typeExtensions: Record<string, unknown> = (type.extensions ||= {});
              typeExtensions.directives = typeDirectives;
            }
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
            typeDirectives.key ||= [];
            if (!typeDirectives.key.some((key: any) => key.fields === fieldName)) {
              typeDirectives.key.push({
                fields: fieldName,
              });
              const typeExtensions: Record<string, unknown> = (type.extensions ||= {});
              typeExtensions.directives = typeDirectives;
            }
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
