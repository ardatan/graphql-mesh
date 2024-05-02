import { DocumentNode, GraphQLSchema } from 'graphql';
import { composeSubgraphs, SubgraphConfig } from '@graphql-mesh/fusion-composition';
import { Logger } from '@graphql-mesh/types';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadTypedefs } from '@graphql-tools/load';
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
        throw new Error(`Failed to load subgraph ${subgraphName} - ${e.stack}`);
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
  let composedSchema = composeSubgraphs(subgraphConfigsForComposition, {
    typeDefs: additionalTypeDefs,
  });
  if (config.transforms?.length) {
    logger.info('Applying transforms');
    for (const transform of config.transforms) {
      composedSchema = transform(composedSchema);
    }
  }
  return composedSchema;
}
