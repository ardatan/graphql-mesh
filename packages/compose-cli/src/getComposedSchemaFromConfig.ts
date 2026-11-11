import {
  buildSchema,
  getNamedType,
  isInterfaceType,
  isNamedType,
  Kind,
  parse,
  print,
  visit,
  type DocumentNode,
  type GraphQLObjectType,
  type GraphQLSchema,
  type ObjectTypeDefinitionNode,
} from 'graphql';
import { type Logger } from '@graphql-hive/logger';
import {
  composeAnnotatedSubgraphs,
  futureAdditions,
  getAnnotatedSubgraphs,
  type FutureAddition,
  type SubgraphConfig,
} from '@graphql-mesh/fusion-composition';
import { parseWithCache } from '@graphql-mesh/utils';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadTypedefs } from '@graphql-tools/load';
import { mergeSchemas } from '@graphql-tools/schema';
import {
  astFromValueUntyped,
  getDocumentNodeFromSchema,
  printSchemaWithDirectives,
} from '@graphql-tools/utils';
import type { ServiceDefinition } from '@theguild/federation-composition';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import type { LoaderContext, MeshComposeCLIConfig } from './types.js';

const isDebug = ['1', 'y', 'yes', 't', 'true'].includes(String(globalThis.process?.env?.DEBUG));

export interface ComposedResult {
  supergraphSdl: string;
  subgraphs: ServiceDefinition[];
}

export async function getComposedSchemaFromConfig(
  config: MeshComposeCLIConfig,
  log: Logger,
): Promise<string> {
  const { supergraphSdl } = await getComposedResultFromConfig(config, log);
  return supergraphSdl;
}

export async function getComposedResultFromConfig(
  config: MeshComposeCLIConfig,
  log: Logger,
): Promise<ComposedResult> {
  const ctx: LoaderContext = {
    fetch: config.fetch || defaultFetch,
    cwd: config.cwd || globalThis.process?.cwd?.(),
    log,
  };
  const subgraphConfigsForComposition: SubgraphConfig[] = await Promise.all(
    config.subgraphs.map(async subgraphCLIConfig => {
      const { name: subgraphName, schema$ } = subgraphCLIConfig.sourceHandler(ctx);
      const subgraphLog = log.child({ subgraph: subgraphName });
      subgraphLog.debug(`Loading subgraph`);
      let subgraphSchema: GraphQLSchema;
      try {
        subgraphSchema = await schema$;
      } catch (e) {
        if (isDebug) {
          subgraphLog.error(`Failed to load subgraph`, e);
        } else {
          subgraphLog.error(e instanceof Error ? e.message : String(e));
          subgraphLog.error(`Failed to load subgraph`);
        }
        globalThis.process?.exit(1);
      }
      return {
        name: subgraphName,
        schema: subgraphSchema,
        transforms: subgraphCLIConfig.transforms,
      };
    }),
  );

  let additionalTypeDefs: DocumentNode[] | undefined;
  if (config.additionalTypeDefs != null) {
    let additionalFieldDirectiveUsed = false;
    if (typeof config.additionalTypeDefs === 'string' && config.additionalTypeDefs?.includes(' ')) {
      try {
        additionalTypeDefs = [parseWithCache(config.additionalTypeDefs)];
      } catch (e) {
        log.error(`Failed to parse additional type definitions: ${e.message || e}`);
        globalThis.process?.exit(1);
      }
    } else {
      const result = await loadTypedefs(config.additionalTypeDefs, {
        noLocation: true,
        assumeValid: true,
        assumeValidSDL: true,
        loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
      });
      additionalTypeDefs = result.map(
        source =>
          source.document ||
          parseWithCache(source.rawSDL || printSchemaWithDirectives(source.schema)),
      );
    }
    additionalTypeDefs = additionalTypeDefs.map(doc =>
      visit(doc, {
        [Kind.FIELD_DEFINITION](node) {
          additionalFieldDirectiveUsed = true;
          return {
            ...node,
            directives: [
              ...(node.directives || []),
              {
                kind: Kind.DIRECTIVE,
                name: { kind: Kind.NAME, value: 'additionalField' },
              },
            ],
          };
        },
      }),
    );
    if (additionalFieldDirectiveUsed) {
      additionalTypeDefs.unshift(
        parse(/* GraphQL */ `
          directive @additionalField on FIELD_DEFINITION
        `),
      );
    }
  }
  const annotatedSubgraphs = getAnnotatedSubgraphs(subgraphConfigsForComposition, {
    ignoreSemanticConventions: config.ignoreSemanticConventions,
    alwaysAddTransportDirective: config.subgraph != null,
  });
  if (config.subgraph) {
    const subgraph = annotatedSubgraphs.find(sg => sg.name === config.subgraph);
    if (!subgraph) {
      log.error(`Subgraph ${config.subgraph} not found`);
      globalThis.process?.exit(1);
    }
    return {
      supergraphSdl: print(subgraph.typeDefs),
      subgraphs: annotatedSubgraphs,
    };
  }
  const result = composeAnnotatedSubgraphs(annotatedSubgraphs);
  if (result.errors?.length) {
    log.error(`Failed to compose subgraphs`);
    for (const error of result.errors) {
      if (isDebug) {
        log.error(error instanceof Error ? error.stack || error.message : String(error));
      } else {
        log.error(error instanceof Error ? error.message : String(error));
      }
    }
    globalThis.process?.exit(1);
  }
  if (!result.supergraphSdl) {
    log.error(`Unknown error: Supergraph is empty`);
    globalThis.process?.exit(1);
  }
  let composedSchema: GraphQLSchema;
  if (futureAdditions.length) {
    let futureAddition: FutureAddition;
    while ((futureAddition = futureAdditions.pop())) {
      additionalTypeDefs ||= [];
      composedSchema ||= buildSchema(result.supergraphSdl, {
        noLocation: true,
        assumeValid: true,
        assumeValidSDL: true,
      });
      const sourceType = composedSchema.getType(futureAddition.sourceTypeName) as GraphQLObjectType;
      if (!sourceType) {
        log.error(`Target type ${futureAddition.sourceTypeName} not found`);
        globalThis.process?.exit(1);
      }
      const sourceField = sourceType.getFields()[futureAddition.sourceFieldName];
      if (!sourceField) {
        log.error(`Target field ${futureAddition.sourceFieldName} not found`);
        globalThis.process?.exit(1);
      }
      const sourceReturnType = getNamedType(sourceField.type);
      if (!isNamedType(sourceReturnType)) {
        log.error(`Target field ${futureAddition.sourceFieldName} has no return type`);
        globalThis.process?.exit(1);
      }
      const interfaceOrType = isInterfaceType(composedSchema.getType(futureAddition.targetTypeName))
        ? 'interface'
        : 'type';
      additionalTypeDefs.push(
        parse(/* GraphQL */ `
          extend ${interfaceOrType} ${futureAddition.targetTypeName} {
            ${futureAddition.targetFieldName}: ${sourceReturnType}
            @additionalField
            @resolveTo(
              sourceTypeName: "${futureAddition.sourceTypeName}",
              sourceFieldName: "${futureAddition.sourceFieldName}",
              sourceName: "${futureAddition.sourceName}",
              sourceArgs: ${print(astFromValueUntyped(futureAddition.sourceArgs))},
              requiredSelectionSet: "${futureAddition.requiredSelectionSet}"
            )
          }
        `),
      );
    }
  }
  if (additionalTypeDefs?.length /* TODO || config.transforms?.length */) {
    composedSchema ||= buildSchema(result.supergraphSdl, {
      noLocation: true,
      assumeValid: true,
      assumeValidSDL: true,
    });
    if (additionalTypeDefs?.length) {
      const originalComposedSchema = composedSchema;
      composedSchema = mergeSchemas({
        schemas: [composedSchema],
        typeDefs: additionalTypeDefs,
        assumeValid: true,
        assumeValidSDL: true,
      });
      // Fix extra additionalField annotations
      if (composedSchema.getDirective('additionalField')) {
        let composedSchemaAST = getDocumentNodeFromSchema(composedSchema);
        composedSchemaAST = visit(composedSchemaAST, {
          [Kind.FIELD_DEFINITION](node, __key, __parent, __path, ancestors) {
            const directiveNames = node.directives?.map(directive => directive.name.value);
            if (directiveNames.includes('additionalField')) {
              if (
                directiveNames.includes('join__field') ||
                directiveNames.includes('source') ||
                directiveNames.includes('meshSource')
              ) {
                return {
                  ...node,
                  directives: node.directives?.filter(
                    directive => directive.name.value !== 'additionalField',
                  ),
                };
              }
              const typeInAncestor = [...ancestors]
                .reverse()
                .find(
                  ancestor =>
                    !Array.isArray(ancestor) &&
                    ancestor != null &&
                    typeof ancestor === 'object' &&
                    'kind' in ancestor,
                ) as ObjectTypeDefinitionNode;
              if (typeInAncestor) {
                const typeInOriginalSchema = originalComposedSchema.getType(
                  typeInAncestor.name.value,
                );
                if (typeInOriginalSchema && 'getFields' in typeInOriginalSchema) {
                  const field = typeInOriginalSchema.getFields()[node.name.value];
                  if (field) {
                    return {
                      ...node,
                      directives: node.directives?.filter(
                        directive => directive.name.value !== 'additionalField',
                      ),
                    };
                  }
                }
              }
            }
          },
        });
        return {
          supergraphSdl: print(composedSchemaAST),
          subgraphs: annotatedSubgraphs,
        };
      }
    }
    /* TODO
    if (config.transforms?.length) {
      log.info('Applying transforms');
      for (const transform of config.transforms) {
        composedSchema = transform(composedSchema);
      }
    }
    */
    return {
      supergraphSdl: printSchemaWithDirectives(composedSchema),
      subgraphs: annotatedSubgraphs,
    };
  }
  return {
    supergraphSdl: result.supergraphSdl,
    subgraphs: annotatedSubgraphs,
  };
}
