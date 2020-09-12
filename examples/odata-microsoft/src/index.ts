import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';

import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';

import { loadFiles } from '@graphql-tools/load-files';

const port = process.env.PORT || 4000;
async function main() {
  const app = express();

  console.info('Generating Mesh Instance...');
  const config = await findAndParseConfig();
  const { schema, contextBuilder } = await getMesh(config);

  app.use(cookieParser());

  app.get('/', function (req, res) {
    res.sendFile(join(__dirname, '/index.html'));
  });

  const queryFiles = await loadFiles(join(__dirname, 'example-queries/**/*.graphql'));

  const apolloServer = new ApolloServer({
    schema,
    context: ({ req }) =>
      contextBuilder({
        accessToken: req.cookies.accessToken,
      }),
    playground: {
      settings: {
        'request.credentials': 'same-origin',
      },
      tabs: queryFiles.map((queryFile, index) => ({
        name: `Query #${index}`,
        endpoint: 'http://localhost:4000/graphql',
        query: queryFile,
      })),
    },
  });

  apolloServer.applyMiddleware({ app, path: '/graphql/' });

  app.listen(port);

  console.log('Listening on ' + port);
}

main().catch(console.error);
