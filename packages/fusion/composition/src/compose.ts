import {
  concatAST,
  getNamedType,
  GraphQLError,
  GraphQLSchema,
  isNonNullType,
  isObjectType,
  isSpecifiedScalarType,
  Kind,
  parse,
  visit,
} from 'graphql';
import type {
  ConstDirectiveNode,
  DirectiveNode,
  DocumentNode,
  GraphQLArgumentConfig,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
} from 'graphql';
import pluralize from 'pluralize';
import { snakeCase } from 'snake-case';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import {
  astFromValueUntyped,
  getDirectiveExtensions,
  getDocumentNodeFromSchema,
  getRootTypeMap,
  MapperKind,
  mapSchema,
  type FieldMapper,
} from '@graphql-tools/utils';
import type { ServiceDefinition } from '@theguild/federation-composition';
import { composeServices } from '@theguild/federation-composition';
import {
  attachVirtualEntityConnect,
  ensureNonResolvableKeysForEntityStubs,
  ensureVirtualConnectLink,
  hasEquivalentTypeConnect,
  toTypeLevelEntityConnect,
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
 * True when the schema has a Federation Connectors **HTTP** contract (SCHEMA
 * `@source(http:)` and/or `@connect(http:)`).
 *
 * A bare connect `@link` plus **virtual** `@connect` (no `http:`) is *not*
 * enough — that pattern is for Router-facing dual annotation while Hive still
 * uses GraphQL `@merge` / `@source`. Treating virtual-only as Federation
 * Connectors would flip the subgraph to connect transport and preempt Mesh
 * type-merging.
 */
export function isFederationConnectorsSubgraph(schema: GraphQLSchema): boolean {
  const directives = getDirectiveExtensions(schema);
  const sources = directives?.source || [];
  if (sources.some((source: { http?: { baseURL?: string } }) => source?.http?.baseURL != null)) {
    return true;
  }
  return schemaHasHttpConnectDirective(schema);
}

/** Connect `@link` present (virtual and/or HTTP Connectors). */
export function schemaHasConnectLink(schema: GraphQLSchema): boolean {
  const links = getDirectiveExtensions(schema)?.link || [];
  return links.some(
    (link: { url?: string }) =>
      typeof link?.url === 'string' && link.url.startsWith('https://specs.apollo.dev/connect'),
  );
}

function schemaHasHttpConnectDirective(schema: GraphQLSchema): boolean {
  let found = false;
  mapSchema(schema, {
    [MapperKind.FIELD]: fieldConfig => {
      if (found) {
        return fieldConfig;
      }
      const connects = getDirectiveExtensions(fieldConfig)?.connect;
      if (Array.isArray(connects) && connects.some((c: { http?: unknown }) => c?.http != null)) {
        found = true;
      }
      return fieldConfig;
    },
    [MapperKind.OBJECT_TYPE]: type => {
      if (found) {
        return type;
      }
      const connects = getDirectiveExtensions(type)?.connect;
      if (Array.isArray(connects) && connects.some((c: { http?: unknown }) => c?.http != null)) {
        found = true;
      }
      return type;
    },
  });
  return found;
}

/** @deprecated Use {@link isFederationConnectorsSubgraph}. */
export const isApolloConnectorsSubgraph = isFederationConnectorsSubgraph;

export function getAnnotatedSubgraphs(
  subgraphs: SubgraphConfig[],
  options: GetAnnotatedSubgraphsOptions = {},
) {
  // Alias Mesh stitching `@source` as `@meshSource` when the composition also has
  // Federation Connectors `@source` *or* a connect `@link` (including virtual-only dual
  // annotation). Otherwise Router's connectors parser treats Mesh `@source` as connect
  // SCHEMA `@source` and fails. Mesh-only graphs (no connect link) keep plain `@source`.
  // Probe with the real subgraph config (never a fake name: prefix transform latches
  // `value` from `subgraphConfig.name` on first call).
  const probeTransformedSchema = (subgraphConfig: SubgraphConfig): GraphQLSchema => {
    let probe = subgraphConfig.schema;
    const transforms = subgraphConfig.transforms;
    if (!transforms?.length) {
      return probe;
    }
    for (const transform of transforms) {
      probe = transform(probe, subgraphConfig);
    }
    return probe;
  };
  const schemaLooksLikeConnectors = (subgraphConfig: SubgraphConfig) => {
    try {
      return isFederationConnectorsSubgraph(probeTransformedSchema(subgraphConfig));
    } catch {
      return false;
    }
  };
  const schemaLooksLikeConnectLink = (subgraphConfig: SubgraphConfig) => {
    try {
      return schemaHasConnectLink(probeTransformedSchema(subgraphConfig));
    } catch {
      return false;
    }
  };
  const compositionHasConnectors = subgraphs.some(schemaLooksLikeConnectors);
  const compositionHasConnectLink = subgraphs.some(schemaLooksLikeConnectLink);
  const compositionHasMeshStitchingSource = subgraphs.some(
    subgraphConfig =>
      !schemaLooksLikeConnectors(subgraphConfig) && !!subgraphConfig.transforms?.length,
  );

  const annotatedSubgraphs: ServiceDefinition[] = [];
  for (const subgraphConfig of subgraphs) {
    const { name: subgraphName, schema, transforms } = subgraphConfig;
    let url: string = subgraphConfig.url;
    const subgraphSchemaExtensions = getDirectiveExtensions(schema);
    let isConnectorsSubgraph = isFederationConnectorsSubgraph(schema);
    const transportDirectives = subgraphSchemaExtensions?.transport;
    const transportDirective = transportDirectives?.[0];
    const apolloSource = (subgraphSchemaExtensions?.source || []).find(
      (source: { http?: { baseURL?: string } }) => source?.http?.baseURL != null,
    );
    // Strip Mesh `@transport` from annotated Federation Connectors subgraph SDL
    // (not part of the connect contract). Hive still gets `@transport` /
    // `@graphql-mesh/transport-connect` on the supergraph via Guild-only extras
    // packing in `composeAnnotatedSubgraphs`.
    let removeTransportDirectiveDefinition = false;
    let removeTransportFromExtras = false;
    if (isConnectorsSubgraph) {
      removeTransportDirectiveDefinition = true;
      removeTransportFromExtras = true;
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
    let virtualConnectUsed = false;
    // Stitching source is only for non-connectors transforms. Connectors transforms
    // rewrite `@connect` selection/http instead of adding Mesh source annotations.
    const sourceDirectiveUsed = !isConnectorsSubgraph && transforms?.length > 0;
    // When Connectors *or* a connect `@link` (incl. federation dual-annotation) are in
    // the composition, alias to `@meshSource` so Apollo Router does not parse Mesh
    // stitching `@source` as Connectors SCHEMA `@source`.
    const aliasMeshSource =
      sourceDirectiveUsed && (compositionHasConnectors || compositionHasConnectLink);
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
        // Federation Connectors must never get stitching `@meshSource` (connect SCHEMA `@source`).
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
            if (
              Array.isArray(directiveExtensions.connect) &&
              directiveExtensions.connect.some((c: { http?: unknown }) => c?.http == null)
            ) {
              virtualConnectUsed = true;
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
        // Keep Federation Connectors SCHEMA `@source`. When aliasing to `@meshSource`,
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
      // Semantic conventions (ById/ByIds) after transforms — including connectors.
      // Connectors with `entity: true` skip Mesh `@merge` inside the helper; `@key` still lands.
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
            if (
              Array.isArray(directiveExtensions.connect) &&
              directiveExtensions.connect.some((c: { http?: unknown }) => c?.http == null)
            ) {
              virtualConnectUsed = true;
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
    // Do **not** dual-emit `@connect(selection: "$this.old")` after Mesh renames.
    // Router requires `$this.<name>` to be a real field on the type; naming-convention
    // removes `old`, so `$this.old` crashes Router startup. Hive keeps `@meshSource`.
    // (Virtual rename still works when both fields remain — see connect-entity helper.)
    if (virtualConnectUsed) {
      transformedSubgraph = ensureVirtualConnectLink(transformedSubgraph);
    }
    // HTTP Connectors added during transforms (e.g. loader emit) → connect transport.
    // Virtual-only `@connect` (no http) must NOT flip GraphQL subgraphs to connect.
    if (!isConnectorsSubgraph && isFederationConnectorsSubgraph(transformedSubgraph)) {
      isConnectorsSubgraph = true;
      removeTransportDirectiveDefinition = true;
      const extensions: Record<string, any> = (transformedSubgraph.extensions ||= {});
      extensions.directives = extensions.directives || {};
      const existingTransport = (extensions.directives.transport || [])[0] || {};
      const mergedOptions = { ...(existingTransport.options || {}) };
      extensions.directives.transport = [
        {
          ...existingTransport,
          subgraph: subgraphName,
          kind: 'connect',
          location: url || existingTransport.location || '',
          ...(Object.keys(mergedOptions).length ? { options: mergedOptions } : {}),
        },
      ];
    }
    const hasVirtualOrHttpConnect =
      isConnectorsSubgraph || schemaHasConnectLink(transformedSubgraph);
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
        // Coexist with Federation Connectors SCHEMA `@source` in mixed compositions.
        importedDirectives.push({ name: '@source', as: '@meshSource' });
      } else {
        importedDirectives.push('@source');
      }
    }
    // Federation connect/v0.4 is recognized via `@link` alone (Rover style) —
    // annotated subgraphs must **not** stamp `@composeDirective(name: "@connect")`.
    // Guild composition still needs that stamp to emit `@join__directive` for
    // `@connect`; we add it only inside `composeAnnotatedSubgraphs`
    // (see `withGuildConnectComposeDirective`).
    // When Mesh stitching `@source` is also in the composition, drop `@source` from the
    // connect `@link` import so Guild does not clash (args stay in extras; post-process
    // restores `@source` on the connect `@link` after lifting SCHEMA directives).
    if (hasVirtualOrHttpConnect && compositionHasMeshStitchingSource) {
      const schemaDirectives = getDirectiveExtensions(transformedSubgraph) || {};
      if (Array.isArray(schemaDirectives.link)) {
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
        const extensions: Record<string, unknown> = (transformedSubgraph.extensions ||= {});
        extensions.directives = schemaDirectives;
      }
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
    // Keep SCHEMA directive usages on the schema (`@source`, `@transport`, …) in
    // annotated subgraph SDL — no `@extraSchemaDefinitionDirective` (Rover-like).
    // Guild cannot preserve SCHEMA usages through compose; packing into Query
    // extras happens only in `composeAnnotatedSubgraphs`.
    if (removeTransportFromExtras) {
      const schemaDirs = getDirectiveExtensions(transformedSubgraph) || {};
      if (schemaDirs.transport) {
        const { transport: _omit, ...rest } = schemaDirs;
        const extensions: Record<string, unknown> = (transformedSubgraph.extensions ||= {});
        extensions.directives = rest;
        transformedSubgraph = new GraphQLSchema({
          ...transformedSubgraph.toConfig(),
          extensions: {
            ...transformedSubgraph.extensions,
            directives: rest,
          },
          astNode: undefined,
          extensionASTNodes: [],
        });
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
  // Annotated subgraphs stay Rover-like: SCHEMA `@source` on `schema`, no
  // `@extraSchemaDefinitionDirective`, no `@composeDirective` for `@connect`.
  // Guild cannot keep SCHEMA usages or connect without those stamps — apply both
  // only for this composeServices call.
  const forGuildCompose = annotatedSubgraphs.map(sg => ({
    ...sg,
    typeDefs: withGuildConnectComposeDirective(
      packSchemaDirectivesIntoExtrasForGuild(sg.typeDefs, sg.name),
    ),
  }));
  const composedSupergraphSdl = composeServices(forGuildCompose);
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

/**
 * Guild drops SCHEMA directive usages. Pack `@source` / `@transport` / … into
 * Query `@extraSchemaDefinitionDirective` for compose only. Annotated subgraphs
 * returned to callers keep those directives on `schema` (no extras wrapper).
 *
 * When Federation Connectors `@source(http.baseURL)` is present without Mesh
 * `@transport` (stripped from annotated SDL), synthesize rest transport for Hive.
 */
function packSchemaDirectivesIntoExtrasForGuild(
  typeDefs: DocumentNode,
  subgraphName: string,
): DocumentNode {
  const packed: Record<string, unknown[]> = {};
  const schemaDirectiveNames = new Set<string>();

  visit(typeDefs, {
    SchemaDefinition(node) {
      collectPackableSchemaDirectives(node.directives, packed, schemaDirectiveNames);
    },
    SchemaExtension(node) {
      collectPackableSchemaDirectives(node.directives, packed, schemaDirectiveNames);
    },
  });

  if (Object.keys(packed).length === 0) {
    return typeDefs;
  }

  // Annotated connectors omit `@transport`; Hive still needs it on the supergraph.
  if (!packed.transport?.length && Array.isArray(packed.source)) {
    for (const src of packed.source) {
      const baseURL =
        src && typeof src === 'object' && (src as { http?: { baseURL?: string } }).http?.baseURL;
      if (typeof baseURL === 'string' && baseURL) {
        packed.transport = [
          {
            subgraph: subgraphName,
            kind: 'connect',
            location: baseURL,
          },
        ];
        schemaDirectiveNames.add('transport');
        break;
      }
    }
  }

  const extrasDirective: ConstDirectiveNode = {
    kind: Kind.DIRECTIVE,
    name: { kind: Kind.NAME, value: 'extraSchemaDefinitionDirective' },
    arguments: [
      {
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: 'directives' },
        value: astFromValueUntyped(packed) as any,
      },
    ],
  };

  const composeExtrasDir: ConstDirectiveNode = {
    kind: Kind.DIRECTIVE,
    name: { kind: Kind.NAME, value: 'composeDirective' },
    arguments: [
      {
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: 'name' },
        value: { kind: Kind.STRING, value: '@extraSchemaDefinitionDirective' },
      },
    ],
  };

  let stampedCompose = false;
  let stampedExtrasOnQuery = false;

  let next = visit(typeDefs, {
    SchemaDefinition(node) {
      const kept = (node.directives || []).filter(
        d => d.name.value === 'link' || d.name.value === 'composeDirective',
      );
      const withCompose = stampedCompose
        ? kept
        : [...ensureFederationComposeDirectiveImport(kept, false), composeExtrasDir];
      stampedCompose = true;
      return { ...node, directives: withCompose };
    },
    SchemaExtension(node) {
      const kept = (node.directives || []).filter(
        d => d.name.value === 'link' || d.name.value === 'composeDirective',
      );
      const withCompose = stampedCompose
        ? kept
        : [...ensureFederationComposeDirectiveImport(kept, false), composeExtrasDir];
      stampedCompose = true;
      return { ...node, directives: withCompose };
    },
    ObjectTypeDefinition(node) {
      if (stampedExtrasOnQuery || node.name.value !== 'Query') {
        return node;
      }
      stampedExtrasOnQuery = true;
      return {
        ...node,
        directives: [...(node.directives || []), extrasDirective],
      };
    },
    ObjectTypeExtension(node) {
      if (stampedExtrasOnQuery || node.name.value !== 'Query') {
        return node;
      }
      stampedExtrasOnQuery = true;
      return {
        ...node,
        directives: [...(node.directives || []), extrasDirective],
      };
    },
  });

  // Ensure Mesh link import + directive defs for extras (Guild composeDirective).
  const extrasDefs = parse(
    /* GraphQL */ `
      scalar _DirectiveExtensions
      directive @extraSchemaDefinitionDirective(
        directives: _DirectiveExtensions
      ) repeatable on OBJECT
    `,
    { noLocation: true },
  );
  next = concatAST([next, extrasDefs]);

  // Ensure Mesh `@link` imports `@extraSchemaDefinitionDirective` (Guild core feature).
  next = visit(next, {
    SchemaDefinition(node) {
      return {
        ...node,
        directives: ensureMeshExtrasLinkImport(node.directives),
      };
    },
    SchemaExtension(node) {
      return {
        ...node,
        directives: ensureMeshExtrasLinkImport(node.directives),
      };
    },
  });

  return next;
}

function ensureMeshExtrasLinkImport(
  directives: readonly ConstDirectiveNode[] | undefined,
): ConstDirectiveNode[] {
  const list = [...(directives || [])];
  const meshIdx = list.findIndex(d => {
    if (d.name.value !== 'link') return false;
    const url = d.arguments?.find(a => a.name.value === 'url');
    return (
      url?.value.kind === Kind.STRING &&
      url.value.value.startsWith('https://the-guild.dev/graphql/mesh/spec/')
    );
  });
  const extrasImport = {
    kind: Kind.STRING as const,
    value: '@extraSchemaDefinitionDirective',
  };
  if (meshIdx < 0) {
    return [
      ...list,
      {
        kind: Kind.DIRECTIVE,
        name: { kind: Kind.NAME, value: 'link' },
        arguments: [
          {
            kind: Kind.ARGUMENT,
            name: { kind: Kind.NAME, value: 'url' },
            value: {
              kind: Kind.STRING,
              value: 'https://the-guild.dev/graphql/mesh/spec/v1.0',
            },
          },
          {
            kind: Kind.ARGUMENT,
            name: { kind: Kind.NAME, value: 'import' },
            value: { kind: Kind.LIST, values: [extrasImport] },
          },
        ],
      },
    ];
  }
  return list.map((d, i) => {
    if (i !== meshIdx) return d;
    const importArg = d.arguments?.find(a => a.name.value === 'import');
    if (!importArg || importArg.value.kind !== Kind.LIST) {
      return {
        ...d,
        arguments: [
          ...(d.arguments || []).filter(a => a.name.value !== 'import'),
          {
            kind: Kind.ARGUMENT,
            name: { kind: Kind.NAME, value: 'import' },
            value: { kind: Kind.LIST, values: [extrasImport] },
          },
        ],
      };
    }
    const already = importArg.value.values.some(
      v => v.kind === Kind.STRING && v.value === '@extraSchemaDefinitionDirective',
    );
    if (already) return d;
    return {
      ...d,
      arguments: (d.arguments || []).map(a => {
        if (a.name.value !== 'import' || a.value.kind !== Kind.LIST) return a;
        return {
          ...a,
          value: {
            ...a.value,
            values: [...a.value.values, extrasImport],
          },
        };
      }),
    };
  });
}

function collectPackableSchemaDirectives(
  directives: readonly ConstDirectiveNode[] | undefined,
  packed: Record<string, unknown[]>,
  names: Set<string>,
) {
  for (const dir of directives || []) {
    if (dir.name.value === 'link' || dir.name.value === 'composeDirective') {
      continue;
    }
    names.add(dir.name.value);
    const args: Record<string, unknown> = {};
    for (const arg of dir.arguments || []) {
      args[arg.name.value] = constValueToJs(arg.value);
    }
    (packed[dir.name.value] ||= []).push(args);
  }
}

function constValueToJs(value: any): unknown {
  switch (value.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
    case Kind.ENUM:
      return value.value;
    case Kind.INT:
      return parseInt(value.value, 10);
    case Kind.FLOAT:
      return parseFloat(value.value);
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return value.values.map(constValueToJs);
    case Kind.OBJECT: {
      const obj: Record<string, unknown> = {};
      for (const f of value.fields) {
        obj[f.name.value] = constValueToJs(f.value);
      }
      return obj;
    }
    default:
      return null;
  }
}

/**
 * Guild federation-composition has no Federation connect/v0.4 special case:
 * without `@composeDirective(name: "@connect")` it drops field/type `@connect`
 * before the supergraph is built. Rover does **not** put that stamp on subgraph
 * SDL — so annotated Mesh subgraphs stay clean, and we only add it for Guild.
 */
function withGuildConnectComposeDirective(typeDefs: DocumentNode): DocumentNode {
  let hasConnectLink = false;
  let hasConnectComposeDirective = false;
  let hasComposeDirectiveImport = false;

  visit(typeDefs, {
    SchemaDefinition(node) {
      inspectSchemaDirectives(node.directives);
    },
    SchemaExtension(node) {
      inspectSchemaDirectives(node.directives);
    },
  });

  function inspectSchemaDirectives(directives: readonly ConstDirectiveNode[] | undefined) {
    for (const dir of directives || []) {
      if (dir.name.value === 'link') {
        const urlArg = dir.arguments?.find(a => a.name.value === 'url');
        const url = urlArg?.value.kind === Kind.STRING ? urlArg.value.value : undefined;
        if (url?.startsWith('https://specs.apollo.dev/connect')) {
          hasConnectLink = true;
        }
        if (url?.startsWith('https://specs.apollo.dev/federation')) {
          const importArg = dir.arguments?.find(a => a.name.value === 'import');
          if (importArg?.value.kind === Kind.LIST) {
            for (const v of importArg.value.values) {
              if (v.kind === Kind.STRING && v.value === '@composeDirective') {
                hasComposeDirectiveImport = true;
              }
            }
          }
        }
      }
      if (dir.name.value === 'composeDirective') {
        const nameArg = dir.arguments?.find(a => a.name.value === 'name');
        if (nameArg?.value.kind === Kind.STRING && nameArg.value.value === '@connect') {
          hasConnectComposeDirective = true;
        }
      }
    }
  }

  if (!hasConnectLink || hasConnectComposeDirective) {
    return typeDefs;
  }

  const composeConnectDir: ConstDirectiveNode = {
    kind: Kind.DIRECTIVE,
    name: { kind: Kind.NAME, value: 'composeDirective' },
    arguments: [
      {
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: 'name' },
        value: { kind: Kind.STRING, value: '@connect' },
      },
    ],
  };

  let stamped = false;
  const stamp = (node: { directives?: readonly ConstDirectiveNode[] }) => {
    if (stamped) {
      return node;
    }
    stamped = true;
    return {
      ...node,
      directives: [
        ...ensureFederationComposeDirectiveImport(node.directives, hasComposeDirectiveImport),
        composeConnectDir,
      ],
    };
  };

  return visit(typeDefs, {
    SchemaDefinition(node) {
      return stamp(node);
    },
    SchemaExtension(node) {
      return stamp(node);
    },
  });
}

function ensureFederationComposeDirectiveImport(
  directives: readonly ConstDirectiveNode[] | undefined,
  alreadyImported: boolean,
): ConstDirectiveNode[] {
  const list = [...(directives || [])];
  if (alreadyImported) {
    return list;
  }
  return list.map(dir => {
    if (dir.name.value !== 'link') {
      return dir;
    }
    const urlArg = dir.arguments?.find(a => a.name.value === 'url');
    const url = urlArg?.value.kind === Kind.STRING ? urlArg.value.value : undefined;
    if (!url?.startsWith('https://specs.apollo.dev/federation')) {
      return dir;
    }
    const importArg = dir.arguments?.find(a => a.name.value === 'import');
    if (!importArg || importArg.value.kind !== Kind.LIST) {
      return {
        ...dir,
        arguments: [
          ...(dir.arguments || []).filter(a => a.name.value !== 'import'),
          {
            kind: Kind.ARGUMENT,
            name: { kind: Kind.NAME, value: 'import' },
            value: {
              kind: Kind.LIST,
              values: [{ kind: Kind.STRING, value: '@composeDirective' }],
            },
          },
        ],
      };
    }
    const already = importArg.value.values.some(
      v => v.kind === Kind.STRING && v.value === '@composeDirective',
    );
    if (already) {
      return dir;
    }
    return {
      ...dir,
      arguments: (dir.arguments || []).map(a => {
        if (a.name.value !== 'import' || a.value.kind !== Kind.LIST) {
          return a;
        }
        return {
          ...a,
          value: {
            ...a.value,
            values: [...a.value.values, { kind: Kind.STRING, value: '@composeDirective' }],
          },
        };
      }),
    };
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
  if (directiveExtensions.merge?.length) {
    return;
  }
  const type = getNamedType(queryFieldConfig.type);
  // Skip when the return type is already a Federation entity (`@key` on AST or extensions).
  // Otherwise semantic dual `@connect` + connect `@link` would flip a real Federation
  // GraphQL subgraph into Connectors mode for Rover (CONNECTORS_UNRESOLVED_FIELD).
  const existingTypeDirectives = getDirectiveExtensions(type) || {};
  if (
    type.astNode?.directives?.some((directive: DirectiveNode) => directive.name.value === 'key') ||
    (Array.isArray(existingTypeDirectives.key) && existingTypeDirectives.key.length > 0)
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
        const ensureKey = () => {
          typeDirectives.key ||= [];
          if (!typeDirectives.key.some((key: any) => key.fields === fieldName)) {
            typeDirectives.key.push({
              fields: fieldName,
            });
            const typeExtensions: Record<string, unknown> = (type.extensions ||= {});
            typeExtensions.directives = typeDirectives;
          }
        };
        // Connectors entity patterns
        // (https://www.apollographql.com/docs/graphos/connectors/entities/patterns):
        // - arg name === key field → Query `@connect(entity: true)`
        // - arg name !== key field (e.g. petId → id) → type-level `@connect` with
        //   `$this.<keyField>` (entity:true would be invalid / ENTITY_RESOLVER_ARGUMENT_MISMATCH)
        // Hive resolves these via REST transport `Query._entities` → resolveReference;
        // no Mesh `@merge` needed for Connectors subgraphs.
        const markConnectEntityOrMerge = () => {
          if (directiveExtensions.connect?.length) {
            const alreadyEntity = directiveExtensions.connect.some((c: any) => c?.entity === true);
            if (alreadyEntity) {
              return;
            }
            if (argName === fieldName) {
              directiveExtensions.connect = directiveExtensions.connect.map((c: any) => ({
                ...c,
                entity: true,
              }));
              return;
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
            return;
          }
          // Non-Connectors: Mesh `@merge` for Hive.
          directiveExtensions.merge ||= [];
          directiveExtensions.merge.push({
            subgraph: subgraphName,
            keyField: fieldName,
            keyArg: argName,
          });
          // Virtual `@connect` only for Mesh-only entities. Skip when the type is already
          // a Federation `@interfaceObject` (Router uses `_entities`; any connect `@link`
          // would make Rover treat the GraphQL subgraph as Connectors-only).
          const isInterfaceObject =
            (Array.isArray(typeDirectives.interfaceObject) &&
              typeDirectives.interfaceObject.length > 0) ||
            type.astNode?.directives?.some(
              (directive: DirectiveNode) => directive.name.value === 'interfaceObject',
            );
          if (!isInterfaceObject) {
            attachVirtualEntityConnect(directiveExtensions, {
              keyField: fieldName,
              keyArg: argName,
              returnType: getNamedType(queryFieldConfig.type),
            });
          }
        };
        switch (queryFieldNameSnakeCase) {
          case snakeCase(type.name):
          // `getCustomer(id:)` — single key-typed arg already matched above; no `_by_id` suffix required.
          // falls through
          case snakeCase(`get_${type.name}`):
          case snakeCase(`get_${type.name}_by_${fieldName}`):
          case snakeCase(`${type.name}_by_${fieldName}`): {
            if (isNonNullType(arg.type)) {
              markConnectEntityOrMerge();
              ensureKey();
            }
            break;
          }
          case snakeCase(pluralTypeName):
          case snakeCase(`get_${pluralTypeName}_by_${fieldName}`):
          case snakeCase(`${pluralTypeName}_by_${fieldName}`):
          case snakeCase(`get_${pluralTypeName}_by_${pluralFieldName}`):
          case snakeCase(`${pluralTypeName}_by_${pluralFieldName}`):
          case snakeCase(`${pluralTypeName}_by_${pluralFieldName}_list`): {
            markConnectEntityOrMerge();
            ensureKey();
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
