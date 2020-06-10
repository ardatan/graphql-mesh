import { findAndParseConfig, getMesh } from '@graphql-mesh/runtime';
import * as yargs from 'yargs';
import { createLogger, format, transports } from 'winston';
import { generateTsTypes } from './commands/typescript';
import { generateSdk } from './commands/generate-sdk';
import { serveMesh } from './commands/serve/serve';
import { resolve } from 'path';
import { writeFile, ensureFile } from 'fs-extra';

const logger = createLogger({
  level: 'info',
  format: format.prettyPrint(),
  transports: [
    new transports.Console({
      format: format.simple(),
    }),
  ],
});

export async function graphqlMesh() {
  return yargs
    .command<{ fork: string | number; port: string | number; 'example-query': string }>(
      'serve',
      'Serves a GraphiQLApolloServer interface to test your Mesh API',
      builder => {
        builder.option('fork', {
          required: false,
          number: true,
          count: true,
        });
        builder.option('port', {
          required: false,
        });
        builder.option('example-query', {
          required: false,
          string: true,
        });
      },
      async ({ fork, port, 'example-query': exampleQuery }) => {
        try {
          const meshConfig = await findAndParseConfig();
          const { schema, contextBuilder } = await getMesh(meshConfig);
          await serveMesh(logger, schema, contextBuilder, fork, port, exampleQuery);
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
            type: 'array',
          })
          .option('depth', {
            type: 'number',
          })
          .option('output', {
            required: true,
            type: 'string',
          });
      },
      async args => {
        const meshConfig = await findAndParseConfig({
          ignoreAdditionalResolvers: true,
        });
        const { schema, destroy } = await getMesh(meshConfig);
        const result = await generateSdk(schema, args);
        const outFile = resolve(process.cwd(), args.output);
        await ensureFile(outFile);
        await writeFile(outFile, result);
        destroy();
      }
    )
    .command<{ output: string }>(
      'typescript',
      'Generates TypeScript typings for the generated mesh',
      builder => {
        builder.option('output', {
          required: true,
          type: 'string',
        });
      },
      async args => {
        const meshConfig = await findAndParseConfig({
          ignoreAdditionalResolvers: true,
        });
        const { schema, rawSources, destroy } = await getMesh(meshConfig);
        const result = await generateTsTypes(schema, rawSources, meshConfig.mergerType);
        const outFile = resolve(process.cwd(), args.output);
        await ensureFile(outFile);
        await writeFile(outFile, result);
        destroy();
      }
    ).argv;
}

graphqlMesh()
  .then(() => {})
  .catch(e => {
    logger.error(e);
  });
