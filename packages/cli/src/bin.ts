#!/usr/bin/env node -r ts-node/register/transpile-only

import { MeshConfig } from './config';
import { executeMesh } from './mesh';
import { generateSdk } from './generate-sdk';
import { cosmiconfig } from 'cosmiconfig';
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
  const explorer = cosmiconfig('mesh');
  const results = await explorer.search(process.cwd());
  const config = results?.config as MeshConfig;

  if (!config) {
    throw new Error(`Unable to find GraphQL Mesh configuration file!`);
  }

  logger.debug(`Loaded configuration file from ${results?.filepath}`);

  yargs
    .command<{ serve: boolean; verbose: boolean }>(
      'build-mesh',
      'Generates unified GraphQL schema based on external APIs',
      builder => {
        builder.option('serve', {
          alias: 's',
          type: 'boolean',
          description:
            'Serves the generated unified GraphQL schema using GraphiQL'
        });
      },
      async args => {
        if (args.verbose) {
          logger.level = 'debug';
        }

        await executeMesh({
          config,
          serve: args.serve,
          logger
        });
      }
    )
    .command<{ verbose: boolean }>(
      'generate-sdk',
      'Generates fully type-safe SDK based on unifid GraphQL schema and GraphQL operations',
      () => null,
      async args => {
        if (args.verbose) {
          logger.level = 'debug';
        }

        await generateSdk({
          config,
          logger,
        });
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
