#!/usr/bin/env node -r ts-node/register/transpile-only

import { writeFileSync } from 'fs';
import { parseConfig, getMesh } from '@graphql-mesh/runtime';
import * as yargs from 'yargs';
import { createLogger, format, transports } from 'winston';
import { generateTsTypes } from './commands/typescript';
import { generateSdk } from './commands/generate-sdk';
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
  yargs
    .command<{}>(
      'serve',
      'Serves a GraphiQLApolloServer interface to test your Mesh API',
      () => null,
      async () => {
        try {
          const meshConfig = await parseConfig();
          const { schema, contextBuilder } = await getMesh(meshConfig);
          await serveMesh(logger, schema, contextBuilder);
        } catch (e) {
          logger.error('Unable to serve mesh: ', e);
        }
      }
    )
    .command<{ operations: string[]; output: string }>(
      'generate-sdk',
      'Generates fully type-safe SDK based on unifid GraphQL schema and GraphQL operations',
      builder => {
        builder
          .option('operations', {
            required: true,
            type: 'array'
          })
          .option('output', {
            required: true,
            type: 'string'
          });
      },
      async args => {
        const meshConfig = await parseConfig();
        const { schema, destroy } = await getMesh(meshConfig);
        const result = await generateSdk(schema, args.operations);
        const outFile = resolve(process.cwd(), args.output);
        const dirName = dirname(outFile);
        mkdirp.sync(dirName);
        writeFileSync(outFile, result);
        destroy();
      }
    )
    .command<{ output: string }>(
      'typescript',
      'Generates TypeScript typings for the generated mesh',
      builder => {
        builder.option('output', {
          required: true,
          type: 'string'
        });
      },
      async args => {
        const meshConfig = await parseConfig();
        const { schema, rawSources, destroy } = await getMesh(meshConfig);
        const result = await generateTsTypes(schema, rawSources);
        const outFile = resolve(process.cwd(), args.output);
        const dirName = dirname(outFile);
        mkdirp.sync(dirName);
        writeFileSync(outFile, result);
        destroy();
      }
    ).argv;
}

graphqlMesh()
  .then(() => {})
  .catch(e => {
    logger.error(e);
  });
