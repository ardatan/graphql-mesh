#!/usr/bin/env node -r ts-node/register/transpile-only

import { ApolloServer } from 'apollo-server';
import { parseConfig, getMesh } from '@graphql-mesh/runtime';
import * as yargs from 'yargs';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.prettyPrint(),
  transports: [
    new transports.Console({
      format: format.simple()
    })
  ]
});

export async function graphqlMesh() {
  // TODO: Add flag for fetching specific config file and not from default path
  const meshConfig = await parseConfig();
  const { schema, contextBuilder } = await getMesh(meshConfig);

  yargs
    .command<{ verbose: boolean }>(
      'serve',
      'Serves a GraphiQLApolloServer interface to test your Mesh API',
      () => null,
      async () => {
        const server = new ApolloServer({
          schema,
          context: () => {
            const context = contextBuilder();
            return context;
          }
        });
      
        server.listen().then(({ url }) => {
          console.log(`🕸️ Serving GraphQL Mesh GraphiQL: ${url}`);
        });
      }
    )
    .command<{ verbose: boolean }>(
      'generate-sdk',
      'Generates fully type-safe SDK based on unifid GraphQL schema and GraphQL operations',
      () => null,
      async args => {
        // TODO
      }
    )
    .command<{ verbose: boolean }>(
      'typescript',
      'Generates TypeScript typings for the generated mesh',
      () => null,
      async args => {
        // TODO
      }
    )
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Run with verbose logging'
    }).argv;
}

graphqlMesh()
  .then(() => {})
  .catch(e => {
    logger.error(e);
  });
