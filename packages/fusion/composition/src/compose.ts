import {
  concatAST,
  getNamedType,
  GraphQLError,
  GraphQLSchema,
  isNonNullType,
  isObjectType,
  isSpecifiedScalarType,
  parse,
} from 'graphql';
import type {
  DirectiveNode,
  GraphQLArgumentConfig,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
} from 'graphql';
import pluralize from 'pluralize';
import { snakeCase } from 'snake-case';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import {
  getDirectiveExtensions,
  getDocumentNodeFromSchema,
  MapperKind,
  mapSchema,
  type FieldMapper,
} from '@graphql-tools/utils';
import type { ServiceDefinition } from '@theguild/federation-composition';
import { composeServices } from '@theguild/federation-composition';
import {
  convertSubgraphToFederationv2,
  detectAndAddMeshDirectives,
  importFederationDirectives,
  importMeshDirectives,
  normalizeDirectiveExtensions,
} from './federation-utils.js';

export interface SubgraphConfig {
  name: string;
  schema: GraphQLSchema;
  transforms?: SubgraphTransform[];
  url?: string;
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

function isEmptyObject(obj: any) {
  if (!obj) {
    return true;
  }
  for (const key in obj) {
    if (obj[key] != null) {
      return false;
    }
  }
  return true;
}

/**
 * Apollo Connectors subgraphs use `@link(url: "https://specs.apollo.dev/connect/...")`
 * and/or schema `@source(http: { baseURL })`. They must not get Mesh `@transport`
 * or stitching `@source(subgraph:)` annotations — transforms rewrite connect SDL instead.
 */
export function isApolloConnectorsSubgraph(schema: GraphQLSchema): boolean {
  const directives = getDirectiveExtensions(schema);
  const links = directives?.link || [];
  if (
    links.some(
      (link: { url?: string }) =>
        typeof link?.url === 'string' && link.url.includes('specs.apollo.dev/connect'),
    )
  ) {
    return true;
  }
  const sources = directives?.source || [];
  return sources.some((source: { http?: { baseURL?: string } }) => source?.http?.baseURL != null);
}

export function getAnnotatedSubgraphs(
  subgraphs: SubgraphConfig[],
  options: GetAnnotatedSubgraphsOptions = {},
) {
  const annotatedSubgraphs: ServiceDefinition[] = [];
  for (const subgraphConfig of subgraphs) {
    const { name: subgraphName, schema, transforms } = subgraphConfig;
    let url: string = subgraphConfig.url;
    const subgraphSchemaExtensions = getDirectiveExtensions(schema);
    const isConnectorsSubgraph = isApolloConnectorsSubgraph(schema);
    const transportDirectives = subgraphSchemaExtensions?.transport;
    const transportDirective = transportDirectives?.[0];
    const apolloSource = (subgraphSchemaExtensions?.source || []).find(
      (source: { http?: { baseURL?: string } }) => source?.http?.baseURL != null,
    );
    // Strip Mesh `@transport` from printed subgraph SDL (directive definition / schema AST).
    // Connectors still keep a rest transport *entry* in schema extensions so Hive Gateway
    // can resolve `@graphql-mesh/transport-rest` via `@extraSchemaDefinitionDirective`.
    let removeTransportDirectiveDefinition = false;
    let removeTransportFromExtras = false;
    if (isConnectorsSubgraph) {
      removeTransportDirectiveDefinition = true;
      if (apolloSource?.http?.baseURL) {
        url = apolloSource.http.baseURL;
      }
    } else if (transportDirective) {
      url = transportDirective.location;
      if (
        !options.alwaysAddTransportDirective &&
        transportDirective.kind === 'http' &&
        !transportDirective.headers &&
        isEmptyObject(transportDirective.options)
      ) {
        removeTransportDirectiveDefinition = true;
        removeTransportFromExtras = true;
      }
    }

    let mergeDirectiveUsed = false;
    // Stitching `@source` is only for non-connectors transforms. Connectors transforms
    // rewrite `@connect` selection/http instead of adding Mesh source annotations.
    const sourceDirectiveUsed = !isConnectorsSubgraph && transforms?.length > 0;
    const normalizedSchema = normalizeDirectiveExtensions(schema);
    if (isConnectorsSubgraph) {
      const extensions: Record<string, any> = (normalizedSchema.extensions ||= {});
      extensions.directives = extensions.directives || {};
      // Hive execution hint — not part of the Apollo Connectors subgraph contract
      extensions.directives.transport = [
        {
          subgraph: subgraphName,
          kind: 'rest',
          location: url || apolloSource?.http?.baseURL || '',
        },
      ];
    } else if (
      removeTransportFromExtras &&
      (normalizedSchema.extensions?.directives as any)?.transport
    ) {
      delete (normalizedSchema.extensions?.directives as any).transport;
    }
    const annotatedSubgraph = mapSchema(normalizedSchema, {
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
      [MapperKind.DIRECTIVE]: directive => {
        if (directive.name === 'transport' && removeTransportDirectiveDefinition) {
          return null;
        }
        // Keep Apollo Connectors `@source`; only strip unused stitching `@source`.
        if (
          !sourceDirectiveUsed &&
          !isConnectorsSubgraph &&
          directive.name === 'source'
        ) {
          return null;
        }
      },
    });
    let transformedSubgraph = annotatedSubgraph;
    if (transforms?.length) {
      for (const transform of transforms) {
        try {
          transformedSubgraph = transform(transformedSubgraph, subgraphConfig);
        } catch (e) {
          const cause = e instanceof Error ? e : new Error(String(e));
          const errorMessage = e instanceof Error ? e.message : String(e);
          throw new Error(
            `Failed to apply transform "${transform.name}" on subgraph "${subgraphName}": ${errorMessage}`,
            { cause },
          );
        }
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
    // Preserve Apollo `@connect` through federation via `@composeDirective`, while keeping
    // the Apollo connect `@link` as the sole feature that imports `@connect` (not Mesh spec).
    if (isConnectorsSubgraph) {
      const schemaDirectives = getDirectiveExtensions(transformedSubgraph) || {};
      const composeDirectives = (schemaDirectives.composeDirective =
        schemaDirectives.composeDirective?.filter(Boolean) || []);
      if (!composeDirectives.some((dir: { name?: string }) => dir.name === '@connect')) {
        composeDirectives.push({ name: '@connect' });
      }
      const extensions: Record<string, unknown> = (transformedSubgraph.extensions ||= {});
      extensions.directives = schemaDirectives;
      transformedSubgraph = importFederationDirectives(transformedSubgraph, ['@composeDirective']);
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
    let extraSchemaDefinitionDirectives: Record<string, any> | undefined;
    const schemaDirectiveExtensions = getDirectiveExtensions(transformedSubgraph);
    if (schemaDirectiveExtensions) {
      const schemaDirectiveExtensionsEntries = Object.entries(schemaDirectiveExtensions);
      const schemaDirectiveExtraEntries = schemaDirectiveExtensionsEntries.filter(
        ([dirName]) =>
          dirName !== 'link' &&
          dirName !== 'composeDirective' &&
          (removeTransportFromExtras ? dirName !== 'transport' : true),
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
          extensionASTNodes: [],
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
        transformedSubgraph = importFederationDirectives(transformedSubgraph, ['@key']);
      }
    }
    if (sourceDirectiveUsed) {
      importedDirectivesAST.add(/* GraphQL */ `
        directive @source(
          name: String!
          type: String
          subgraph: String!
        ) repeatable on SCALAR | OBJECT | FIELD_DEFINITION | ARGUMENT_DEFINITION | INTERFACE | UNION | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
      `);
    }

    const queryType = transformedSubgraph.getQueryType();
    if (queryType) {
      const queryTypeDirectives = getDirectiveExtensions(queryType) || {};

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

      const queryTypeExtensions: Record<string, unknown> = (queryType.extensions ||= {});
      queryTypeExtensions.directives = queryTypeDirectives;
    }

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

  alwaysAddTransportDirective?: boolean;
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
    supergraphSdl: composedSupergraphSdl.supergraphSdl?.trim(),
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
  if (
    type.astNode?.directives?.some((directive: DirectiveNode) => directive.name.value === 'key')
  ) {
    return;
  }
  if (isObjectType(type)) {
    const fieldMap = type.getFields();
    let fieldNames = Object.keys(fieldMap) as string[];
    if (fieldNames.includes('id')) {
      fieldNames = ['id'];
    } else {
      const nonNullOnes = fieldNames.filter(fieldName => isNonNullType(fieldMap[fieldName].type));
      if (nonNullOnes.length) {
        fieldNames = nonNullOnes;
      }
    }
    for (const fieldName of fieldNames) {
      const objectField = fieldMap[fieldName];
      const objectFieldType = getNamedType(objectField.type);
      const argEntries = Object.entries(queryFieldConfig.args);
      const pluralFieldName = pluralize(fieldName);
      let argName: string;
      let arg: GraphQLArgumentConfig;
      if (argEntries.length === 1) {
        const argType = getNamedType(argEntries[0][1].type);
        if (argType.name === objectFieldType.name) {
          [argName, arg] = argEntries[0];
        }
      } else {
        for (const [currentArgName, currentArg] of argEntries) {
          if (currentArgName === fieldName || pluralFieldName === currentArgName) {
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
            if (isNonNullType(arg.type)) {
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
            }
            break;
          }
          case snakeCase(pluralTypeName):
          case snakeCase(`get_${pluralTypeName}_by_${fieldName}`):
          case snakeCase(`${pluralTypeName}_by_${fieldName}`):
          case snakeCase(`get_${pluralTypeName}_by_${pluralFieldName}`):
          case snakeCase(`${pluralTypeName}_by_${pluralFieldName}`):
          case snakeCase(`${pluralTypeName}_by_${pluralFieldName}_list`): {
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
