import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';
import * as yargs from 'yargs';
import { generateTsTypes } from './commands/typescript';
import { generateSdk } from './commands/generate-sdk';
import { serveMesh } from './commands/serve/serve';
import { isAbsolute, resolve } from 'path';
import { existsSync } from 'fs';
import { logger } from './logger';
import { introspectionFromSchema } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { jsonFlatStringify, writeFile, writeJSON } from '@graphql-mesh/utils';

export { generateSdk, serveMesh };

export async function graphqlMesh() {
  let baseDir = process.cwd();

  return yargs
    .help()
    .option('r', {
      alias: 'require',
      describe: 'Loads specific require.extensions before running the codegen and reading the configuration',
      type: 'array' as const,
      default: [],
      coerce: (externalModules: string[]) =>
        Promise.all(
          externalModules.map(module => {
            const localModulePath = resolve(process.cwd(), module);
            const islocalModule = existsSync(localModulePath);
            return import(islocalModule ? localModulePath : module);
          })
        ),
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
          await serveMesh(baseDir, args.port);
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
        const outFile = isAbsolute(args.output) ? args.output : resolve(process.cwd(), args.output);
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
        let fileContent: string;
        const fileName = args.output;
        if (fileName.endsWith('.json')) {
          const introspection = introspectionFromSchema(schema);
          fileContent = jsonFlatStringify(introspection, null, 2);
        } else if (
          fileName.endsWith('.graphql') ||
          fileName.endsWith('.graphqls') ||
          fileName.endsWith('.gql') ||
          fileName.endsWith('.gqls')
        ) {
          const printedSchema = printSchemaWithDirectives(schema);
          fileContent = printedSchema;
        } else {
          logger.error(`Invalid file extension ${fileName}`);
          destroy();
          return;
        }
        const outFile = isAbsolute(fileName) ? fileName : resolve(process.cwd(), fileName);
        await writeFile(outFile, fileContent);
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
        const outFile = isAbsolute(args.output) ? args.output : resolve(process.cwd(), args.output);
        await writeFile(outFile, result);
        destroy();
      }
    )
    .command(
      'write-introspection-cache',
      'Writes introspection cache and creates it from scratch',
      builder => {},
      async () => {
        const meshConfig = await findAndParseConfig({
          dir: baseDir,
          ignoreIntrospectionCache: true,
          ignoreAdditionalResolvers: true,
        });
        const { destroy } = await getMesh(meshConfig);
        const outFile = isAbsolute(meshConfig.config.introspectionCache)
          ? meshConfig.config.introspectionCache
          : resolve(baseDir, meshConfig.config.introspectionCache);
        await writeJSON(outFile, meshConfig.introspectionCache);
        destroy();
      }
    ).argv;
}
