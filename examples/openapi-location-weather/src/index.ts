import { ApolloServer } from 'apollo-server';
import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const meshConfig = await findAndParseConfig();
  const { schema, contextBuilder } = await getMesh(meshConfig);

  const apolloServer = new ApolloServer({
    schema,
    context: contextBuilder,
    playground: {
      tabs: [
        {
          endpoint: '/graphql',
          query: readFileSync(join(__dirname, '../example-query.graphql'), 'utf-8'),
        },
      ],
    },
  });

  const { url } = await apolloServer.listen(4000);
  console.info(`🚀 Server ready at ${url}`);
}

main().catch(err => console.error(err));
