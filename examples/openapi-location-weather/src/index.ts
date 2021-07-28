import { ApolloServer } from 'apollo-server';
import { getBuiltMesh } from '../.mesh';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const { schema, contextBuilder } = await getBuiltMesh();

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
