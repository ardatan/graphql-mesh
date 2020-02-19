import { ApolloServer } from 'apollo-server';
import { getMesh, parseConfig } from '@graphql-mesh/runtime';

async function main() {
  const meshConfig = await parseConfig();
  const { schema } = await getMesh(meshConfig);
  
  const server = new ApolloServer({ schema });
  
  server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
  });
}

main();