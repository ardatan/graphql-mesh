#!/usr/bin/env node -r ts-node/register/transpile-only

import { writeFileSync } from 'fs';
import { parseConfig, getMesh } from '@graphql-mesh/runtime';
import * as yargs from 'yargs';
import { createLogger, format, transports } from 'winston';
import { generateTsTypes } from './commands/typescript';
import { serveMesh } from './commands/serve';
import { resolve, dirname } from 'path';
import * as mkdirp from 'mkdirp';

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
  const { schema, contextBuilder, rawSources } = await getMesh(meshConfig);

  yargs
    .command<{ verbose: boolean }>(
      'serve',
      'Serves a GraphiQLApolloServer interface to test your Mesh API',
      () => null,
      async () => {
        await serveMesh(logger, schema, contextBuilder);
      }
    )
    .command<{ verbose: boolean }>(
      'generate-sdk',
      'Generates fully type-safe SDK based on unifid GraphQL schema and GraphQL operations',
      () => null,
      async args => {
        // TODO: Generate SDK based on operations
      }
    )
    .command<{ verbose: boolean, output: string }>(
      'typescript',
      'Generates TypeScript typings for the generated mesh',
      () => null,
      async (args) => {
        const result = await generateTsTypes(logger, schema, rawSources);
        const outFile = resolve(process.cwd(), args.output);
        const dirName = dirname(outFile);
        mkdirp.sync(dirName);
        writeFileSync(outFile, result);
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
