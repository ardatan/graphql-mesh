import { DocumentNode, GraphQLSchema } from 'graphql';
import { composeSubgraphs, SubgraphConfig } from '@graphql-mesh/fusion-composition';
import { DefaultLogger } from '@graphql-mesh/utils';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadTypedefs } from '@graphql-tools/load';
import { fetch as defaultFetch } from '@whatwg-node/fetch';
import { LoaderContext, MeshComposeCLIConfig } from './types.js';

export async function getComposedSchemaFromConfig(
  meshComposeCLIConfig: MeshComposeCLIConfig,
  spinnies?: Spinnies,
) {
  const ctx: LoaderContext = {
    fetch: meshComposeCLIConfig.fetch || defaultFetch,
    cwd: meshComposeCLIConfig.cwd || globalThis.process?.cwd?.(),
    logger: new DefaultLogger(),
  };
  const subgraphConfigsForComposition: SubgraphConfig[] = await Promise.all(
    meshComposeCLIConfig.subgraphs.map(async subgraphCLIConfig => {
      const { name: subgraphName, schema$ } = subgraphCLIConfig.sourceHandler(ctx);
      spinnies?.add(subgraphName, { text: `Loading subgraph ${subgraphName}` });
      let subgraphSchema: GraphQLSchema;
      try {
        subgraphSchema = await schema$;
      } catch (e) {
        throw new Error(`Failed to load subgraph ${subgraphName} - ${e.stack}`);
      }
      spinnies?.succeed(subgraphName, { text: `Loaded subgraph ${subgraphName}` });
      return {
        name: subgraphName,
        schema: subgraphSchema,
        transforms: subgraphCLIConfig.transforms,
      };
    }),
  );
  spinnies?.add('composition', { text: `Composing fusiongraph` });
  let additionalTypeDefs: (DocumentNode | string)[] | undefined;
  if (meshComposeCLIConfig.additionalTypeDefs != null) {
    const result = await loadTypedefs(meshComposeCLIConfig.additionalTypeDefs, {
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
  if (meshComposeCLIConfig.transforms?.length) {
    spinnies?.add('transforms', { text: `Applying transforms` });
    for (const transform of meshComposeCLIConfig.transforms) {
      composedSchema = transform(composedSchema);
    }
    spinnies?.succeed('transforms', { text: `Applied transforms` });
  }
  spinnies?.succeed('composition', { text: `Composed fusiongraph` });
  return composedSchema;
}
