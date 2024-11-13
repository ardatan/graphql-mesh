import {
  buildSchema,
  GraphQLObjectType,
  isNamedType,
  Kind,
  parse,
  print,
  visit,
  type DocumentNode,
  type GraphQLSchema,
} from 'graphql';
import {
  composeSubgraphs,
  getAnnotatedSubgraphs,
  type SubgraphConfig,
} from '@graphql-mesh/fusion-composition';
import type { Logger } from '@graphql-mesh/types';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadTypedefs } from '@graphql-tools/load';
import { mergeSchemas } from '@graphql-tools/schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import type { LoaderContext, MeshComposeCLIConfig } from './types.js';

const isDebug = ['1', 'y', 'yes', 't', 'true'].includes(String(process.env.DEBUG));

export async function getComposedSchemaFromConfig(config: MeshComposeCLIConfig, logger: Logger) {
  const ctx: LoaderContext = {
    fetch: config.fetch || defaultFetch,
    cwd: config.cwd || globalThis.process?.cwd?.(),
    logger,
  };
  const subgraphConfigsForComposition: SubgraphConfig[] = await Promise.all(
    config.subgraphs.map(async subgraphCLIConfig => {
      const { name: subgraphName, schema$ } = subgraphCLIConfig.sourceHandler(ctx);
      const log = logger.child(`[${subgraphName}]`);
      log.debug(`Loading subgraph`);
      let subgraphSchema: GraphQLSchema;
      try {
        subgraphSchema = await schema$;
      } catch (e) {
        if (isDebug) {
          log.error(`Failed to load subgraph`, e);
        } else {
          log.error(e.message || e);
          log.error(`Failed to load subgraph`);
        }
        process.exit(1);
      }
      return {
        name: subgraphName,
        schema: subgraphSchema,
        transforms: subgraphCLIConfig.transforms,
      };
    }),
  );

  if (config.useHATEOAS) {
    if (!config.additionalTypeDefs) {
      config.additionalTypeDefs = '';
    }

    // the operationCatalog is used to map each link path to its relevant values
    const operationCatalog = subgraphConfigsForComposition.reduce((catalog, config) => {
      Object.entries(config.schema.getQueryType().getFields()).forEach(([key, value]) => {
        const httpOperation = value.astNode.directives.find(
          directive => directive.name.value === 'httpOperation',
        );
        if (!httpOperation) return;
        const pathArgument = httpOperation.arguments.find(arg => arg.name.value === 'path');
        if (!pathArgument) return;
        if (pathArgument.value.kind === 'StringValue') {
          const path = pathArgument.value.value.replace(/args./, '');
          if (isNamedType(value.type)) {
            catalog[path.replace(/(\{[^}]+\})/, '{}')] = {
              sourceType: value.type.name,
              sourceName: config.name,
              sourceFieldName: key,
              sourceArgs: (path.match(/\{([^}]+)\}/g) || []).map(param => param.slice(1, -1)),
            };
          }
        }
      });
      return catalog;
    }, {});

    let additionalTypeDefsFromHATEOAS = '';
    subgraphConfigsForComposition.forEach(conf => {
      Object.entries(conf.schema.getTypeMap()).forEach(([key, value]) => {
        if (value instanceof GraphQLObjectType) {
          if (value.getFields()?._links) {
            if (value.constructor.name === 'GraphQLObjectType') {
              let subTypeDefs = `extend type ${key} {\n`;
              // @ts-ignore
              const links = value.getFields()?._links.type._links;
              links.forEach(link => {
                const linkName =
                  typeof config.useHATEOAS === 'object' && config.useHATEOAS.linkNameIdentifier
                    ? link[config.useHATEOAS.linkNameIdentifier]
                    : link['rel'];
                const linkPath =
                  typeof config.useHATEOAS === 'object' && config.useHATEOAS.linkPathIdentifier
                    ? link[config.useHATEOAS.linkPathIdentifier]
                    : link['href'];
                // remove path parameters
                const linkPathAnonymized = linkPath?.replace(/(\{[^}]+\})/, '{}');
                // get path parameters
                const linkPathParams = (linkPath?.match(/\{([^}]+)\}/g) || []).map(param =>
                  param.slice(1, -1),
                );

                const matchedCatalogPath = operationCatalog[linkPathAnonymized];
                if (matchedCatalogPath) {
                  const requiredSelectionSet = linkPathParams.map(param => param).join(',');
                  const sourceArgs = matchedCatalogPath.sourceArgs
                    .map((arg, index) => `${arg}: "{root.${linkPathParams[index]}}"`)
                    .join(',');

                  subTypeDefs += `${linkName}: ${matchedCatalogPath.sourceType}\n
                    @resolveTo(\n
                      sourceName: "${matchedCatalogPath.sourceName}"\n
                      sourceTypeName: "Query"\n
                      sourceFieldName: "${matchedCatalogPath.sourceFieldName}"\n
                      requiredSelectionSet: "{ ${requiredSelectionSet} }"\n
                      sourceArgs: { ${sourceArgs} }\n
                    )\n`;
                }
              });
              subTypeDefs += `}\n`;
              // remove empty subTypeDefs
              subTypeDefs = subTypeDefs.replace(`extend type ${key} {\n}\n`, '');
              additionalTypeDefsFromHATEOAS += subTypeDefs;
            }
          }
        }
      });
    });

    config.additionalTypeDefs += additionalTypeDefsFromHATEOAS;
  }

  let additionalTypeDefs: DocumentNode[] | undefined;
  if (config.additionalTypeDefs != null) {
    const result = await loadTypedefs(config.additionalTypeDefs, {
      noLocation: true,
      assumeValid: true,
      assumeValidSDL: true,
      loaders: [new GraphQLFileLoader()],
    });
    let additionalFieldDirectiveUsed = false;
    additionalTypeDefs = result
      .map(r => r.document || parse(r.rawSDL, { noLocation: true }))
      .map(doc =>
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
  if (config.subgraph) {
    const annotatedSubgraphs = getAnnotatedSubgraphs(subgraphConfigsForComposition, {
      ignoreSemanticConventions: config.ignoreSemanticConventions,
    });
    const subgraph = annotatedSubgraphs.find(sg => sg.name === config.subgraph);
    if (!subgraph) {
      logger.error(`Subgraph ${config.subgraph} not found`);
      process.exit(1);
    }
    return print(subgraph.typeDefs);
  }
  const result = composeSubgraphs(subgraphConfigsForComposition);
  if (result.errors?.length) {
    logger.error(`Failed to compose subgraphs`);
    for (const error of result.errors) {
      if (isDebug) {
        logger.error(error);
      } else {
        logger.error(error.message || error);
      }
    }
    process.exit(1);
  }
  if (!result.supergraphSdl) {
    logger.error(`Unknown error: Supergraph is empty`);
    process.exit(1);
  }
  if (additionalTypeDefs?.length /* TODO || config.transforms?.length */) {
    let composedSchema = buildSchema(result.supergraphSdl, {
      noLocation: true,
      assumeValid: true,
      assumeValidSDL: true,
    });
    if (additionalTypeDefs?.length) {
      composedSchema = mergeSchemas({
        schemas: [composedSchema],
        typeDefs: additionalTypeDefs,
        assumeValid: true,
        assumeValidSDL: true,
      });
    }
    /* TODO
    if (config.transforms?.length) {
      logger.info('Applying transforms');
      for (const transform of config.transforms) {
        composedSchema = transform(composedSchema);
      }
    }
    */
    return printSchemaWithDirectives(composedSchema);
  }
  return result.supergraphSdl;
}
