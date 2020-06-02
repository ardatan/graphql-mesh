import { ApolloServer } from 'apollo-server';
import { getMesh, findAndParseConfig } from '@graphql-mesh/runtime';

async function main() {
  const meshConfig = await findAndParseConfig();
  const { schema, contextBuilder } = await getMesh(meshConfig);

  const apolloServer = new ApolloServer({
    schema,
    context: contextBuilder,
  });

  const { url } = await apolloServer.listen(4000);
  console.info(`🚀 Server ready at ${url}`);
}

main().catch(err => console.error(err));
