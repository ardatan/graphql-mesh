import { GraphQLSchema } from 'graphql';

export interface ComposeLocalSchemaWithApolloSubgraphOpts {
  name: string;
  schema: GraphQLSchema;
  url?: string;
}

export async function composeLocalSchemasWithApollo(
  subgraphs: ComposeLocalSchemaWithApolloSubgraphOpts[],
) {
  const { IntrospectAndCompose, LocalGraphQLDataSource } = await import('@apollo/gateway');
  let { supergraphSdl, cleanup } = await new IntrospectAndCompose({
    subgraphs: subgraphs.map(({ name, url = `http://localhost/${name}` }) => ({
      name,
      url,
    })),
  }).initialize({
    update(updatedSupergraphSdl: string) {
      supergraphSdl = updatedSupergraphSdl;
    },
    healthCheck: async () => {},
    getDataSource({ name }) {
      const subgraph = subgraphs.find(subgraph => subgraph.name === name);
      if (!subgraph) {
        throw new Error(`Subgraph ${name} not found`);
      }
      return new LocalGraphQLDataSource(subgraph.schema);
    },
  });
  await cleanup();
  return supergraphSdl;
}
