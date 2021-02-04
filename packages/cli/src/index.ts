import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';
import * as yargs from 'yargs';
import { generateTsTypes } from './commands/typescript';
import { generateSdk } from './commands/generate-sdk';
import { serveMesh } from './commands/serve/serve';
import { isAbsolute, resolve } from 'path';
import { promises as fsPromises } from 'fs';
import { logger } from './logger';
import { introspectionFromSchema } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
export { generateSdk, serveMesh };

const { writeFile } = fsPromises || {};

export async function graphqlMesh() {
  let baseDir = process.cwd();

  return yargs
    .help()
    .option('r', {
      alias: 'require',
      describe: 'Loads specific require.extensions before running the codegen and reading the configuration',
      type: 'array' as const,
      default: [],
      coerce: (externalModules: string[]) => Promise.all(externalModules.map(mod => import(mod))),
    })
    .option('dir', {
      describe: 'Modified the base directory to use for looking for meshrc config file',
      type: 'string',
      default: process.cwd(),
      coerce: dir => {
        if (isAbsolute(dir)) {
          baseDir = dir;
        } else {
          baseDir = resolve(process.cwd(), dir);
        }
      },
    })
    .command<{ port: number }>(
      'serve',
      'Serves a GraphQL server with GraphQL interface to test your Mesh API',
      builder => {
        builder.option('port', {
          type: 'number',
        });
      },
      async args => {
        try {
          const meshConfig = await findAndParseConfig({
            dir: baseDir,
          });
          const { schema, contextBuilder, pubsub } = await getMesh(meshConfig);
          const serveConfig = meshConfig.config.serve || {};
          serveConfig.port = args.port || parseInt(process.env.PORT) || serveConfig.port || 4000;
          await serveMesh(logger, schema, contextBuilder, pubsub, baseDir, serveConfig);
        } catch (e) {
          logger.error('Unable to serve mesh: ', e);
        }
      }
    )
    .command<{ operations: string[]; output: string; depth: number; 'flatten-types': boolean }>(
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
          })
          .option('flatten-types', {
            type: 'boolean',
          });
      },
      async args => {
        const meshConfig = await findAndParseConfig({
          dir: baseDir,
          ignoreAdditionalResolvers: true,
        });
        const { schema, destroy } = await getMesh(meshConfig);
        const result = await generateSdk(schema, args);
        const outFile = resolve(baseDir, args.output);
        await writeFile(outFile, result);
        destroy();
      }
    )
    .command<{ output: string }>(
      'dump-schema',
      'Generates a JSON introspection / GraphQL SDL schema file from your mesh.',
      builder => {
        builder.option('output', {
          required: true,
          type: 'string',
        });
      },
      async args => {
        const meshConfig = await findAndParseConfig({
          dir: baseDir,
          ignoreAdditionalResolvers: true,
        });
        const { schema, destroy } = await getMesh(meshConfig);
        let outputFileContent: string;
        const outputFileName = args.output;
        if (outputFileName.endsWith('.json')) {
          const introspection = introspectionFromSchema(schema);
          outputFileContent = JSON.stringify(introspection, null, 2);
        } else if (
          outputFileName.endsWith('.graphql') ||
          outputFileName.endsWith('.graphqls') ||
          outputFileName.endsWith('.gql') ||
          outputFileName.endsWith('.gqls')
        ) {
          const printedSchema = printSchemaWithDirectives(schema);
          outputFileContent = printedSchema;
        } else {
          logger.error(`Invalid file extension ${outputFileName}`);
          destroy();
          return;
        }
        const absoluteOutputFilePath = resolve(baseDir, outputFileName);
        await writeFile(absoluteOutputFilePath, outputFileContent);
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
          dir: baseDir,
          ignoreAdditionalResolvers: true,
        });
        const { schema, rawSources, destroy } = await getMesh(meshConfig);
        const result = await generateTsTypes(schema, rawSources, meshConfig.mergerType);
        const outFile = resolve(baseDir, args.output);
        await writeFile(outFile, result);
        destroy();
      }
    ).argv;
}
