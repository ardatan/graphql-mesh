import { buildSchema, DocumentNode, extendSchema, GraphQLSchema, parse, print } from 'graphql';
import {
  composeSubgraphs,
  getAnnotatedSubgraphs,
  SubgraphConfig,
} from '@graphql-mesh/fusion-composition';
import { Logger } from '@graphql-mesh/types';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadTypedefs } from '@graphql-tools/load';
import { mergeSchemas } from '@graphql-tools/schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import { LoaderContext, MeshComposeCLIConfig } from './types.js';

export async function getComposedSchemaFromConfig(config: MeshComposeCLIConfig, logger: Logger) {
  const ctx: LoaderContext = {
    fetch: config.fetch || defaultFetch,
    cwd: config.cwd || globalThis.process?.cwd?.(),
    logger,
  };
  const subgraphConfigsForComposition: SubgraphConfig[] = await Promise.all(
    config.subgraphs.map(async subgraphCLIConfig => {
      const { name: subgraphName, schema$ } = subgraphCLIConfig.sourceHandler(ctx);
      const log = logger.child(`"${subgraphName}" subgraph`);
      log.info(`Loading`);
      let subgraphSchema: GraphQLSchema;
      try {
        subgraphSchema = await schema$;
      } catch (e) {
        log.error(`Failed to load subgraph ${subgraphName}`);
        throw e;
      }
      return {
        name: subgraphName,
        schema: subgraphSchema,
        transforms: subgraphCLIConfig.transforms,
      };
    }),
  );
  let additionalTypeDefs: (DocumentNode | string)[] | undefined;
  if (config.additionalTypeDefs != null) {
    const result = await loadTypedefs(config.additionalTypeDefs, {
      noLocation: true,
      assumeValid: true,
      assumeValidSDL: true,
      loaders: [new GraphQLFileLoader()],
    });
    additionalTypeDefs = result.map(r => r.document || r.rawSDL);
  }
  if (config.subgraph) {
    const annotatedSubgraphs = getAnnotatedSubgraphs(subgraphConfigsForComposition);
    const subgraph = annotatedSubgraphs.find(sg => sg.name === config.subgraph);
    if (!subgraph) {
      throw new Error(`Subgraph ${config.subgraph} not found`);
    }
    return print(subgraph.typeDefs);
  }
  const result = composeSubgraphs(subgraphConfigsForComposition);
  if (result.errors?.length) {
    throw new Error(
      `Failed to compose subgraphs; \n${result.errors.map(e => `- ${e.message}`).join('\n')}`,
    );
  }
  if (!result.supergraphSdl) {
    throw new Error(`Unknown error: composed schema is empty`);
  }
  if (additionalTypeDefs?.length || config.transforms?.length) {
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
    if (config.transforms?.length) {
      logger.info('Applying transforms');
      for (const transform of config.transforms) {
        composedSchema = transform(composedSchema);
      }
    }
    return printSchemaWithDirectives(composedSchema);
  }
  return result.supergraphSdl;
}
