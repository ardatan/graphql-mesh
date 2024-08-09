import type { GraphQLSchema } from 'graphql';
import { IntrospectAndCompose, LocalGraphQLDataSource } from '@apollo/gateway';

export function composeWithApollo(
  subgraphs: {
    name: string;
    url?: string;
    schema: GraphQLSchema;
  }[],
) {
  const subgraphMap = new Map<string, GraphQLSchema>();
  for (const subgraph of subgraphs) {
    subgraphMap.set(subgraph.name, subgraph.schema);
  }
  return new IntrospectAndCompose({
    subgraphs,
  })
    .initialize({
      getDataSource(opts) {
        const schema = subgraphMap.get(opts.name);
        if (!schema) {
          throw new Error(`Subgraph ${opts.name} not found`);
        }
        return new LocalGraphQLDataSource(schema);
      },
      update() {},
      async healthCheck() {},
    })
    .then(res => res.cleanup().then(() => res.supergraphSdl));
}
