import {
  concatAST,
  getNamedType,
  getNullableType,
  GraphQLError,
  GraphQLSchema,
  isListType,
  isNonNullType,
  isObjectType,
  isSpecifiedScalarType,
  parse,
  type DirectiveNode,
  type GraphQLArgumentConfig,
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLType,
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
  ensureNonResolvableKeysForEntityStubs,
  hasEquivalentTypeConnect,
  toTypeLevelEntityConnect,
  toTypeLevelEntityProtobufRpc,
} from './connect-entity.js';
import { finalizeConnectorsSupergraph } from './connectors-supergraph.js';
import {
  convertSubgraphToFederationv2,
  detectAndAddMeshDirectives,
  importFederationDirectives,
  importMeshDirectives,
  normalizeDirectiveExtensions,
  type MeshDirectiveImport,
} from './federation-utils.js';
import { liftExtraSchemaDefinitionDirectives } from './lift-extra-schema-directives.js';

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
 * Federation Connectors subgraphs use `@link(url: "https://specs.apollo.dev/connect/...")`
 * and/or schema `@source(http: { baseURL })`. They must not get Mesh `@transport`
 * or stitching `@meshSource(subgraph:)` annotations — transforms rewrite connect SDL instead.
 */
export function isFederationConnectorsSubgraph(schema: GraphQLSchema): boolean {
  const directives = getDirectiveExtensions(schema);
  const links = directives?.link || [];
  if (
    links.some(
      (link: { url?: string }) =>
        typeof link?.url === 'string' && link.url.startsWith('https://specs.apollo.dev/connect'),
    )
  ) {
    return true;
  }
  const sources = directives?.source || [];
  return sources.some((source: { http?: { baseURL?: string } }) => source?.http?.baseURL != null);
}

/** @deprecated Use {@link isFederationConnectorsSubgraph}. */
export const isApolloConnectorsSubgraph = isFederationConnectorsSubgraph;

/**
 * Protobuf RPC subgraphs (`@transport(kind: "protobuf")`) follow the Connectors transform
 * posture: rename/naming-convention rewrite `@protobuf__rpc(args|selection)` binds instead
 * of stamping Mesh `@source` / `@meshSource`, and semantic conventions use `@key` +
 * `entity: true` instead of Mesh `@merge`.
 */
export function isProtobufRpcSubgraph(schema: GraphQLSchema): boolean {
  const transports = getDirectiveExtensions(schema)?.transport || [];
  return transports.some(
    (transport: { kind?: string }) => transport?.kind === 'protobuf' || transport?.kind === 'grpc',
  );
}

/**
 * Neo4j subgraphs use `@neo4j/graphql` identity directives (`@node(labels:)`,
 * `@alias(property:)`, `@plural`) instead of Mesh `@source` / `@meshSource` for
 * rename / naming-convention transforms. Detect via `@transport(kind: "neo4j")`.
 */
export function isNeo4jSubgraph(schema: GraphQLSchema): boolean {
  const transports = getDirectiveExtensions(schema)?.transport || [];
  return transports.some((transport: { kind?: string }) => transport?.kind === 'neo4j');
}

/**
 * True when transforms should rewrite directive mappings instead of Mesh `@source`
 * (Connectors `@connect`, protobuf `@protobuf__rpc`, Neo4j `@node` / `@alias` / `@plural`).
 */
export function skipsMeshSourceAnnotations(schema: GraphQLSchema): boolean {
  return (
    isFederationConnectorsSubgraph(schema) ||
    isProtobufRpcSubgraph(schema) ||
    isNeo4jSubgraph(schema)
  );
}

/** @deprecated Use {@link skipsMeshSourceAnnotations}. */
export const skipsMeshSourceStamps = skipsMeshSourceAnnotations;

export function getAnnotatedSubgraphs(
  subgraphs: SubgraphConfig[],
  options: GetAnnotatedSubgraphsOptions = {},
) {
  // Alias Mesh stitching `@source` as `@meshSource` only when the composition also
  // has Federation Connectors (SCHEMA `@source`). Mesh-only graphs keep plain `@source`.
  const compositionHasConnectors = subgraphs.some(({ schema }) =>
    isFederationConnectorsSubgraph(schema),
  );
  const compositionHasMeshStitchingSource = subgraphs.some(
    ({ schema, transforms }) => !skipsMeshSourceAnnotations(schema) && !!transforms?.length,
  );

  const annotatedSubgraphs: ServiceDefinition[] = [];
  for (const subgraphConfig of subgraphs) {
    const { name: subgraphName, schema, transforms } = subgraphConfig;
    let url: string = subgraphConfig.url;
    const subgraphSchemaExtensions = getDirectiveExtensions(schema);
    const isConnectorsSubgraph = isFederationConnectorsSubgraph(schema);
    const transportDirectives = subgraphSchemaExtensions?.transport;
    const transportDirective = transportDirectives?.[0];
    const apolloSource = (subgraphSchemaExtensions?.source || []).find(
      (source: { http?: { baseURL?: string } }) => source?.http?.baseURL != null,
    );
    // Strip Mesh `@transport` from printed subgraph SDL (directive definition / schema AST).
    // Connectors still keep a connect transport *entry* in schema extensions so Hive Gateway
    // can resolve `@graphql-mesh/transport-connect` via `@extraSchemaDefinitionDirective`.
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
    // Stitching source is only for subgraphs that do not rewrite directive mappings
    // (Connectors `@connect`, protobuf `@protobuf__rpc`, Neo4j `@node` / `@alias`).
    const sourceDirectiveUsed = !skipsMeshSourceAnnotations(schema) && transforms?.length > 0;
    // When Connectors are in the same composition, alias to `@meshSource` so Guild
    // does not treat Mesh + Apollo `@source` as one composed directive.
    const aliasMeshSource = sourceDirectiveUsed && compositionHasConnectors;
    const meshSourceDirectiveName = aliasMeshSource ? 'meshSource' : 'source';
    const normalizedSchema = normalizeDirectiveExtensions(schema);
    if (isConnectorsSubgraph) {
      const extensions: Record<string, any> = (normalizedSchema.extensions ||= {});
      extensions.directives = extensions.directives || {};
      const existingTransport = (extensions.directives.transport || [])[0] || {};
      // Hive execution hint — not part of the Federation Connectors subgraph contract.
      // Preserve kind-specific `options` from the loader (qs / timeout / …).
      const mergedOptions = { ...(existingTransport.options || {}) };
      extensions.directives.transport = [
        {
          ...existingTransport,
          subgraph: subgraphName,
          kind: 'connect',
          location: url || apolloSource?.http?.baseURL || existingTransport.location || '',
          ...(Object.keys(mergedOptions).length ? { options: mergedOptions } : {}),
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
        const existingSourceDirectives =
          existingDirectives?.[meshSourceDirectiveName] || existingDirectives?.source || [];
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
          [meshSourceDirectiveName]: {
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
            const existingSourceDirectives =
              directives[meshSourceDirectiveName] || directives.source || [];
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
                  [meshSourceDirectiveName]: {
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
        const existingSourceDirectives =
          existingDirectives[meshSourceDirectiveName] || existingDirectives.source || [];
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
              [meshSourceDirectiveName]: {
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
        const existingSourceDirectives =
          existingDirectives[meshSourceDirectiveName] || existingDirectives.source || [];
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
              [meshSourceDirectiveName]: {
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
        // Connectors must never get stitching `@meshSource` (Apollo owns SCHEMA `@source`).
        if (!sourceDirectiveUsed) {
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
          return fieldConfig;
        }
        const newArgs: GraphQLFieldConfigArgumentMap = {};
        if (fieldConfig.args) {
          for (const argName in fieldConfig.args) {
            const arg = fieldConfig.args[argName];
            const directives = getDirectiveExtensions(arg);
            const existingSourceDirectives =
              directives[meshSourceDirectiveName] || directives.source || [];
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
                  [meshSourceDirectiveName]: {
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
        const existingSourceDirectives =
          directiveExtensions[meshSourceDirectiveName] || directiveExtensions.source || [];
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
              [meshSourceDirectiveName]: {
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
        // Keep Apollo SCHEMA `@source` on connectors. When aliasing to `@meshSource`,
        // drop any leftover Mesh `@source` def on non-connectors.
        if (directive.name === 'source' && !isConnectorsSubgraph && aliasMeshSource) {
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
      // Semantic conventions (ById/ByIds) after transforms — including connectors / protobuf.
      // `@connect` / `@protobuf__rpc` with `entity: true` skip Mesh `@merge`; `@key` still lands.
      transformedSubgraph = mapSchema(transformedSubgraph, {
        [MapperKind.ROOT_FIELD]: (fieldConfig, fieldName) => {
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
    // Cross-subgraph Connectors stubs → `@key(..., resolvable: false)` so Hive
    // plans `_entities` (Router already resolves stubs from selection). Runs for
    // OpenAPI subgraphs with no transforms as well as transform pipelines.
    if (isConnectorsSubgraph && !options.ignoreSemanticConventions) {
      transformedSubgraph = ensureNonResolvableKeysForEntityStubs(transformedSubgraph);
    }
    transformedSubgraph = convertSubgraphToFederationv2(transformedSubgraph);
    transformedSubgraph = detectAndAddMeshDirectives(transformedSubgraph);
    const importedDirectives: MeshDirectiveImport[] = [];
    if (mergeDirectiveUsed) {
      importedDirectives.push('@merge');
    }
    if (sourceDirectiveUsed) {
      if (aliasMeshSource) {
        // Coexist with Apollo SCHEMA `@source` in mixed compositions.
        importedDirectives.push({ name: '@source', as: '@meshSource' });
      } else {
        importedDirectives.push('@source');
      }
    }
    // Preserve Apollo `@connect` through federation via `@composeDirective`.
    // When Mesh stitching `@source` is also in the composition, drop `@source` from the
    // connect `@link` import so Guild does not clash (args stay in extras; post-process
    // restores `@source` on the connect `@link` after lifting SCHEMA directives).
    if (isConnectorsSubgraph) {
      const schemaDirectives = getDirectiveExtensions(transformedSubgraph) || {};
      const composeDirectives = (schemaDirectives.composeDirective =
        schemaDirectives.composeDirective?.filter(Boolean) || []);
      if (!composeDirectives.some((dir: { name?: string }) => dir.name === '@connect')) {
        composeDirectives.push({ name: '@connect' });
      }
      if (compositionHasMeshStitchingSource && Array.isArray(schemaDirectives.link)) {
        schemaDirectives.link = schemaDirectives.link.map(
          (link: { url?: string; import?: any[] }) => {
            if (
              typeof link?.url === 'string' &&
              link.url.startsWith('https://specs.apollo.dev/connect') &&
              Array.isArray(link.import)
            ) {
              return {
                ...link,
                import: link.import.filter(item => {
                  if (typeof item === 'string') {
                    return item !== '@source' && item !== 'source';
                  }
                  if (item && typeof item === 'object' && 'name' in item) {
                    const name = String((item as { name?: string }).name || '');
                    return name !== '@source' && name !== 'source';
                  }
                  return true;
                }),
              };
            }
            return link;
          },
        );
      }
      const extensions: Record<string, unknown> = (transformedSubgraph.extensions ||= {});
      extensions.directives = schemaDirectives;
      transformedSubgraph = importFederationDirectives(transformedSubgraph, ['@composeDirective']);
    }
    const fieldMapper: FieldMapper = (fieldConfig, fieldName) => {
      const fieldDirectives = getDirectiveExtensions(fieldConfig);
      const sourceDirectives =
        fieldDirectives?.[meshSourceDirectiveName] || fieldDirectives?.source;
      if (sourceDirectives?.length) {
        const filteredSourceDirectives = sourceDirectives.filter(
          sourceDirective =>
            sourceDirective.name !== fieldName ||
            sourceDirective.type !== fieldConfig.type.toString(),
        );
        fieldDirectives[meshSourceDirectiveName] = filteredSourceDirectives;
        if (aliasMeshSource) {
          delete fieldDirectives.source;
        }
      }
      if ('args' in fieldConfig) {
        const newArgs: GraphQLFieldConfigArgumentMap = {};
        for (const argName in fieldConfig.args) {
          const arg = fieldConfig.args[argName];
          const argDirectives = getDirectiveExtensions(arg);
          const sourceDirectives =
            argDirectives?.[meshSourceDirectiveName] || argDirectives?.source;
          if (sourceDirectives?.length) {
            const filteredSourceDirectives = sourceDirectives.filter(
              sourceDirective =>
                sourceDirective.name !== argName || sourceDirective.type !== arg.type.toString(),
            );
            const argExtensionDirectives: Record<string, any> = {
              ...argDirectives,
              [meshSourceDirectiveName]: filteredSourceDirectives,
            };
            if (aliasMeshSource) {
              delete argExtensionDirectives.source;
            }
            newArgs[argName] = {
              ...arg,
              extensions: {
                ...arg.extensions,
                directives: argExtensionDirectives,
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
    // Remove unnecessary @meshSource directives
    transformedSubgraph = mapSchema(transformedSubgraph, {
      [MapperKind.TYPE]: type => {
        const typeDirectives = getDirectiveExtensions(type);
        const sourceDirectives =
          typeDirectives?.[meshSourceDirectiveName] || typeDirectives?.source;
        if (sourceDirectives?.length) {
          const filteredSourceDirectives = sourceDirectives.filter(
            sourceDirective => sourceDirective.name !== type.name,
          );
          const typeExtensions: Record<string, any> = (type.extensions ||= {});
          typeExtensions.directives = {
            ...typeDirectives,
            [meshSourceDirectiveName]: filteredSourceDirectives,
          };
          if (aliasMeshSource) {
            delete typeExtensions.directives.source;
          }
        }
        return type;
      },
      [MapperKind.ROOT_FIELD]: fieldMapper,
      [MapperKind.FIELD]: fieldMapper as any,
      [MapperKind.ENUM_VALUE]: (valueConfig, _typeName, _schema, externalValue) => {
        const valueDirectives = getDirectiveExtensions(valueConfig);
        const sourceDirectives =
          valueDirectives?.[meshSourceDirectiveName] || valueDirectives?.source;
        if (sourceDirectives?.length) {
          const filteredSourceDirectives = sourceDirectives.filter(
            sourceDirective => sourceDirective.name !== externalValue,
          );
          const valueExtensions: Record<string, any> = (valueConfig.extensions ||= {});
          valueExtensions.directives = {
            ...valueDirectives,
            [meshSourceDirectiveName]: filteredSourceDirectives,
          };
          if (aliasMeshSource) {
            delete valueExtensions.directives.source;
          }
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
        directive @${meshSourceDirectiveName}(
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
        importedDirectives.push('@extraSchemaDefinitionDirective');
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

    if (importedDirectives.length) {
      transformedSubgraph = importMeshDirectives(transformedSubgraph, importedDirectives);
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
  const rawSupergraphSdl = composedSupergraphSdl.supergraphSdl?.trim();
  // Lift SCHEMA extras, then rewrite Connectors to `@join__directive` metadata
  // so the same Mesh supergraph runs on Hive Gateway and Apollo Router
  // (Hive's REST transport reads join__directive; Router requires it).
  const lifted = rawSupergraphSdl
    ? liftExtraSchemaDefinitionDirectives(rawSupergraphSdl)
    : rawSupergraphSdl;
  return {
    ...composedSupergraphSdl,
    supergraphSdl: lifted ? finalizeConnectorsSupergraph(lifted) : lifted,
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
        const ensureKey = (opts?: { resolvable?: boolean }) => {
          typeDirectives.key ||= [];
          const existing = typeDirectives.key.find((key: any) => key.fields === fieldName);
          if (!existing) {
            typeDirectives.key.push({
              fields: fieldName,
              ...(opts?.resolvable === false ? { resolvable: false } : {}),
            });
          } else if (opts?.resolvable !== false && existing.resolvable === false) {
            // Singular entity resolver exists — upgrade a previously batch-stamped non-resolvable key.
            delete existing.resolvable;
          }
          const typeExtensions: Record<string, unknown> = (type.extensions ||= {});
          typeExtensions.directives = typeDirectives;
        };
        // Non-resolvable @key is only for Connectors/protobuf batch RPCs that lack a singular
        // entity resolver. Ordinary Mesh `@merge` batch fields keep the default resolvable key.
        const isConnectOrProtobufField = !!(
          directiveExtensions.connect?.length ||
          directiveExtensions.protobuf__rpc?.length ||
          directiveExtensions.protobufRpc?.length
        );
        // Connectors entity patterns
        // (https://www.apollographql.com/docs/graphos/connectors/entities/patterns):
        // - arg name === key field → Query `@connect(entity: true)`
        // - arg name !== key field (e.g. petId → id) → type-level `@connect` with
        //   `$this.<keyField>` (entity:true would be invalid / ENTITY_RESOLVER_ARGUMENT_MISMATCH)
        // Hive resolves these via REST transport `Query._entities` → resolveReference;
        // no Mesh `@merge` needed for Connectors subgraphs.
        /** True when this call stamped `entity: true` or a type-level entity resolver. */
        const markConnectEntityOrMerge = (): boolean => {
          // Batch list args (e.g. `id: [ID!]!` / `ids: [ID!]!`) must not get
          // `entity: true` or `$this.<scalarKey>` — resolveReference supplies a scalar.
          const batchListArg = isBatchListArgType(arg.type);
          if (directiveExtensions.connect?.length) {
            const alreadyEntity = directiveExtensions.connect.some((c: any) => c?.entity === true);
            if (alreadyEntity) {
              return true;
            }
            if (batchListArg) {
              return false;
            }
            // Entity representation only carries key fields. Require every non-null arg
            // to be that key (id-only). Extra required args (e.g. locale) cannot be filled.
            const requiredArgNames = argEntries
              .filter(([, a]) => isNonNullType(a.type))
              .map(([name]) => name);
            const requiredArgsAreKeyOnly =
              requiredArgNames.length > 0 && requiredArgNames.every(name => name === argName);
            if (argName === fieldName) {
              if (!requiredArgsAreKeyOnly) {
                return false;
              }
              directiveExtensions.connect = directiveExtensions.connect.map((c: any) => ({
                ...c,
                entity: true,
              }));
              return true;
            }
            if (!requiredArgsAreKeyOnly) {
              return false;
            }
            // Type-level entity connector: `/pet/{$args.petId}` → `/pet/{$this.id}`
            const typeConnects = directiveExtensions.connect.map((c: any) =>
              toTypeLevelEntityConnect(c, argName, fieldName),
            );
            typeDirectives.connect ||= [];
            for (const tc of typeConnects) {
              if (!hasEquivalentTypeConnect(typeDirectives.connect, tc)) {
                typeDirectives.connect.push(tc);
              }
            }
            const typeExtensions: Record<string, unknown> = (type.extensions ||= {});
            typeExtensions.directives = typeDirectives;
            return true;
          }
          const protobufKey = directiveExtensions.protobuf__rpc?.length
            ? 'protobuf__rpc'
            : directiveExtensions.protobufRpc?.length
              ? 'protobufRpc'
              : undefined;
          if (protobufKey) {
            const alreadyEntity = directiveExtensions[protobufKey].some(
              (c: any) => c?.entity === true,
            );
            if (alreadyEntity) {
              return true;
            }
            if (batchListArg) {
              return false;
            }
            // Entity representation only carries key fields. Require every non-null arg
            // to be that key (id-only). Extra required args (e.g. locale) cannot be filled.
            const requiredArgNames = argEntries
              .filter(([, a]) => isNonNullType(a.type))
              .map(([name]) => name);
            const requiredArgsAreKeyOnly =
              requiredArgNames.length > 0 && requiredArgNames.every(name => name === argName);
            if (argName === fieldName) {
              if (requiredArgsAreKeyOnly) {
                directiveExtensions[protobufKey] = directiveExtensions[protobufKey].map(
                  (c: any) => ({
                    ...c,
                    entity: true,
                  }),
                );
                return true;
              }
              // Extra required args: leave field-level RPC as-is (no entity: true / type-level).
              return false;
            }
            if (!requiredArgsAreKeyOnly) {
              return false;
            }
            // Type-level entity RPC: rewrite key arg binds → `$this.<keyField>`.
            const typeRpcs = directiveExtensions[protobufKey].map((c: any) =>
              toTypeLevelEntityProtobufRpc(c, argName, fieldName),
            );
            typeDirectives[protobufKey] ||= [];
            for (const tr of typeRpcs) {
              if (
                !typeDirectives[protobufKey].some(
                  (existing: any) =>
                    existing?.service === tr?.service &&
                    existing?.method === tr?.method &&
                    existing?.args === tr?.args,
                )
              ) {
                typeDirectives[protobufKey].push(tr);
              }
            }
            const typeExtensions: Record<string, unknown> = (type.extensions ||= {});
            typeExtensions.directives = typeDirectives;
            return true;
          }
          // Other non-Connectors subgraphs still use Mesh `@merge` for type merging.
          directiveExtensions.merge ||= [];
          directiveExtensions.merge.push({
            subgraph: subgraphName,
            keyField: fieldName,
            keyArg: argName,
          });
          return true;
        };
        switch (queryFieldNameSnakeCase) {
          case snakeCase(type.name):
          // `getCustomer(id:)` — single key-typed arg already matched above; no `_by_id` suffix required.
          // falls through
          case snakeCase(`get_${type.name}`):
          case snakeCase(`get_${type.name}_by_${fieldName}`):
          case snakeCase(`${type.name}_by_${fieldName}`): {
            if (isNonNullType(arg.type)) {
              const batchListArg = isBatchListArgType(arg.type);
              const hasSingularEntity = markConnectEntityOrMerge();
              // Only advertise a resolvable @key when a singular entity resolver exists.
              // Batch keys and protobuf/Connect fields that could not become entity stay
              // non-resolvable so `_entities` is not claimed without a usable resolver.
              ensureKey(
                isConnectOrProtobufField && (batchListArg || !hasSingularEntity)
                  ? { resolvable: false }
                  : undefined,
              );
            }
            break;
          }
          case snakeCase(pluralTypeName):
          case snakeCase(`get_${pluralTypeName}_by_${fieldName}`):
          case snakeCase(`${pluralTypeName}_by_${fieldName}`):
          case snakeCase(`get_${pluralTypeName}_by_${pluralFieldName}`):
          case snakeCase(`${pluralTypeName}_by_${pluralFieldName}`):
          case snakeCase(`${pluralTypeName}_by_${pluralFieldName}_list`): {
            const batchListArg = isBatchListArgType(arg.type);
            const hasSingularEntity = markConnectEntityOrMerge();
            // Batch Connectors/protobuf Query fields keep field-level RPC only; a resolvable
            // @key would claim a missing singular entity resolver for `_entities`. Mesh `@merge`
            // batch fields still use the default resolvable key.
            ensureKey(
              isConnectOrProtobufField && (batchListArg || !hasSingularEntity)
                ? { resolvable: false }
                : undefined,
            );
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

function isBatchListArgType(argType: GraphQLType): boolean {
  return isListType(getNullableType(argType));
}
