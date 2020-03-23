import { ApolloServer } from 'apollo-server';
import { getMesh, parseConfig } from '@graphql-mesh/runtime';

async function main() {
  const meshConfig = await parseConfig();
  const { schema, contextBuilder } = await getMesh(meshConfig);

  const server = new ApolloServer({
    schema,
    context: contextBuilder,
  });

  server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
}

main();
