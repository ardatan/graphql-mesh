import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';
import * as yargs from 'yargs';
import { generateTsTypes } from './commands/typescript';
import { generateSdk } from './commands/generate-sdk';
import { serveMesh } from './commands/serve/serve';
import { resolve } from 'path';
import { writeFile, ensureFile } from 'fs-extra';
import { logger } from './logger';
export * from './commands/generate-sdk';

export async function graphqlMesh() {
  return yargs
    .help()
    .option('r', {
      alias: 'require',
      describe: 'Loads specific require.extensions before running the codegen and reading the configuration',
      type: 'array' as const,
      default: [],
      coerce: (externalModules: string[]) => Promise.all(externalModules.map(mod => import(mod))),
    })
    .command(
      'serve',
      'Serves a GraphiQLApolloServer interface to test your Mesh API',
      builder => {},
      async () => {
        try {
          const meshConfig = await findAndParseConfig();
          const { schema, contextBuilder } = await getMesh(meshConfig);
          await serveMesh(logger, schema, contextBuilder, meshConfig.config.serve);
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
