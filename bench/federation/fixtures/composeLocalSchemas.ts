import { GraphQLSchema } from 'graphql';
import { IntrospectAndCompose, LocalGraphQLDataSource } from '@apollo/gateway';

/**
 * Compose executable subgraph schemas into a supergraph SDL (same approach as
 * Hive Gateway `@internal/testing` composeLocalSchemasWithApollo).
 */
export async function composeLocalSchemas(
  localSchemas: Record<string, GraphQLSchema>,
): Promise<string> {
  const subgraphs = Object.entries(localSchemas).map(([name, schema]) => ({
    name,
    schema,
    url: `http://localhost/${name}`,
  }));

  let updatedSdl = '';
  const { supergraphSdl, cleanup } = await new IntrospectAndCompose({
    subgraphs: subgraphs.map(({ name, url }) => ({ name, url })),
  }).initialize({
    update(next) {
      updatedSdl = next;
    },
    healthCheck: async () => {},
    getDataSource({ name }) {
      const subgraph = subgraphs.find(s => s.name === name);
      if (!subgraph) {
        throw new Error(`Subgraph ${name} not found`);
      }
      return new LocalGraphQLDataSource(subgraph.schema);
    },
  });

  const sdl = typeof supergraphSdl === 'string' ? supergraphSdl : updatedSdl;
  await cleanup();
  if (!sdl) {
    throw new Error('Failed to compose local schemas with Apollo');
  }
  return sdl;
}
