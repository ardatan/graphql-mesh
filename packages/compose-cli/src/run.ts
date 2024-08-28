import 'dotenv/config'; // inject dotenv options to process.env

// eslint-disable-next-line import/no-nodejs-modules
import { promises as fsPromises } from 'fs';
import module from 'node:module';
// eslint-disable-next-line import/no-nodejs-modules
import { isAbsolute, join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { parse } from 'graphql';
import { Command, Option } from '@commander-js/extra-typings';
import type { Logger } from '@graphql-mesh/types';
import { DefaultLogger } from '@graphql-mesh/utils';
import { getComposedSchemaFromConfig } from './getComposedSchemaFromConfig.js';
import type { MeshComposeCLIConfig } from './types.js';

/** Default config paths sorted by priority. */
const defaultConfigPaths = [
  'mesh.config.ts',
  'mesh.config.mts',
  'mesh.config.cts',
  'mesh.config.js',
  'mesh.config.mjs',
  'mesh.config.cjs',
];

let program = new Command()
  .addOption(
    new Option(
      '-c, --config-path <path>',
      `path to the configuration file. defaults to the following files respectively in the current working directory: ${defaultConfigPaths.join(', ')}`,
    ).env('CONFIG_PATH'),
  )
  .option('--subgraph <name>', 'name of the subgraph to compose')
  .option('-o, --output <path>', 'path to the output file');

export interface RunOptions extends ReturnType<typeof program.opts> {
  /** @default new DefaultLogger() */
  log?: Logger;
  /** @default Mesh Compose */
  productName?: string;
  /** @default compose a GraphQL federated schema from any API service(s) */
  productDescription?: string;
  /** @default mesh-compose */
  binName?: string;
  /** @default undefined */
  version?: string;
}

export async function run({
  log: rootLog = new DefaultLogger(),
  productName = 'Mesh Compose',
  productDescription = 'compose a GraphQL federated schema from any API service(s)',
  binName = 'mesh-compose',
  version,
}: RunOptions): Promise<void | never> {
  module.register('@graphql-mesh/include/hooks', pathToFileURL('./'));

  program = program.name(binName).description(productDescription);
  if (version) program = program.version(version);
  if (process.env.NODE_ENV === 'test') program = program.allowUnknownOption();
  const opts = program.parse().opts();

  const log = rootLog.child(` ${productName}`);

  let importedConfig: MeshComposeCLIConfig;
  if (!opts.configPath) {
    log.info(`Searching for default config files`);
    for (const configPath of defaultConfigPaths) {
      const absoluteConfigPath = resolve(process.cwd(), configPath);
      const exists = await fsPromises
        .lstat(absoluteConfigPath)
        .then(() => true)
        .catch(() => false);
      if (exists) {
        log.info(`Found default config file ${configPath}`);
        const module = await import(absoluteConfigPath);
        importedConfig = Object(module).composeConfig;
        if (!importedConfig) {
          throw new Error(`No "composeConfig" exported from default config at ${configPath}`);
        }
        break;
      }
    }
    if (!importedConfig) {
      throw new Error(
        `Cannot find default config file at ${defaultConfigPaths.join(' or ')} in the current working directory`,
      );
    }
  } else {
    // using user-provided config
    const configPath = isAbsolute(opts.configPath)
      ? opts.configPath
      : resolve(process.cwd(), opts.configPath);
    log.info(`Loading config file at path ${configPath}`);
    const exists = await fsPromises
      .lstat(configPath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      throw new Error(`Cannot find config file at ${configPath}`);
    }
    const module = await import(configPath);
    importedConfig = Object(module).composeConfig;
    if (!importedConfig) {
      throw new Error(`No "composeConfig" exported from config at ${configPath}`);
    }
  }
  log.info('Loaded config');

  const config: MeshComposeCLIConfig = {
    ...importedConfig,
    ...opts,
  };

  log.info('Composing');

  const supergraphSdl = await getComposedSchemaFromConfig(config, log);

  let output = config.output;
  if (!output) {
    if (typeof process === 'object') {
      process.stdout.write(supergraphSdl + '\n');
    } else {
      console.log(supergraphSdl);
    }
    log.info('Done!');
    return;
  }

  log.info(`Writing schema to ${output}`);

  output = isAbsolute(output) ? output : join(process.cwd(), output);
  let writtenData: string;
  if (output.endsWith('.json')) {
    writtenData = JSON.stringify(parse(supergraphSdl, { noLocation: true }), null, 2);
  } else if (
    output.endsWith('.graphql') ||
    output.endsWith('.gql') ||
    output.endsWith('.graphqls') ||
    output.endsWith('.gqls')
  ) {
    writtenData = supergraphSdl;
  } else if (
    output.endsWith('.ts') ||
    output.endsWith('.cts') ||
    output.endsWith('.mts') ||
    output.endsWith('.js') ||
    output.endsWith('.cjs') ||
    output.endsWith('.mjs')
  ) {
    writtenData = `export default ${JSON.stringify(supergraphSdl)}`;
  } else {
    throw new Error(`Unsupported file extension for ${output}`);
  }
  await fsPromises.writeFile(output, writtenData, 'utf8');

  log.info('Done!');
}
