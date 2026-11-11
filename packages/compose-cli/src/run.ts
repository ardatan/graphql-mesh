import 'dotenv/config'; // inject dotenv options to globalThis.process?.env

// eslint-disable-next-line import/no-nodejs-modules
import { Console } from 'node:console';
// eslint-disable-next-line import/no-nodejs-modules
import { promises as fsPromises } from 'node:fs';
// eslint-disable-next-line import/no-nodejs-modules
import module from 'node:module';
// eslint-disable-next-line import/no-nodejs-modules
import { isAbsolute, join } from 'node:path';
// eslint-disable-next-line import/no-nodejs-modules
import { pathToFileURL } from 'node:url';
import { parse, print } from 'graphql';
import { Command, Option } from '@commander-js/extra-typings';
import { ConsoleLogWriter, Logger } from '@graphql-hive/logger';
import { getComposedResultFromConfig } from './getComposedSchemaFromConfig.js';
import type { MeshComposeCLIConfig } from './types.js';
import { validateSupergraphSdl } from './validate.js';

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
  .option('-o, --output <path>', 'path to the output file')
  .option(
    '--subgraphs-dir <path>',
    'write each annotated subgraph SDL (and subgraphs.json manifest) into this directory',
  );

export interface RunOptions extends ReturnType<typeof program.opts> {
  /** @default new Logger() */
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
  log: rootLog = new Logger({
    writers: [new ConsoleLogWriter({ console: new Console(globalThis.process?.stderr) })],
  }),
  productName = 'Mesh Compose',
  productDescription = 'compose a GraphQL federated schema from any API service(s)',
  binName = 'mesh-compose',
  version,
}: RunOptions): Promise<void | never> {
  module.register(
    '@graphql-hive/importer/hooks',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore bob will complain when bundling for cjs
    import.meta.url,
  );

  program = program.name(binName).description(productDescription);
  if (version) program = program.version(version);
  if (globalThis.process?.env?.NODE_ENV === 'test')
    program = program.allowUnknownOption().allowExcessArguments();
  const opts = program.parse().opts();

  const log = rootLog.child(productName);

  let importedConfig: MeshComposeCLIConfig;
  if (!opts.configPath) {
    log.debug(`Searching for default config files`);
    for (const configPath of defaultConfigPaths) {
      const absoluteConfigPath = join(globalThis.process?.cwd?.() ?? '.', configPath);
      const exists = await fsPromises
        .lstat(absoluteConfigPath)
        .then(() => true)
        .catch(() => false);
      if (exists) {
        log.info(`Found default config file ${absoluteConfigPath}`);
        const importUrl = pathToFileURL(absoluteConfigPath).toString();
        const module = await import(importUrl);
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
      : join(globalThis.process?.cwd?.() ?? '.', opts.configPath);
    log.debug(`Loading config file at path ${configPath}`);
    const exists = await fsPromises
      .lstat(configPath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      throw new Error(`Cannot find config file at ${configPath}`);
    }
    const importUrl = pathToFileURL(configPath).toString();
    const module = await import(importUrl);
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

  const { supergraphSdl, subgraphs } = await getComposedResultFromConfig(config, log);
  if (!config.subgraph) {
    const errors = validateSupergraphSdl(supergraphSdl, subgraphs);
    if (errors.length) {
      log.error(`Composition validation failed with the following errors:`);
      for (const error of errors) {
        log.error(error.message);
      }
      globalThis.process?.exit(1);
    }
  }

  let output = config.output;
  if (!output) {
    if (typeof process === 'object') {
      globalThis.process?.stdout.write(supergraphSdl + '\n');
    } else {
      console.log(supergraphSdl);
    }
  } else {
    log.info(`Writing schema to ${output}`);

    output = isAbsolute(output) ? output : join(globalThis.process?.cwd?.() ?? '.', output);
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
  }

  if (opts.subgraphsDir) {
    const subgraphsDir = isAbsolute(opts.subgraphsDir)
      ? opts.subgraphsDir
      : join(globalThis.process?.cwd?.() ?? '.', opts.subgraphsDir);
    await fsPromises.mkdir(subgraphsDir, { recursive: true });
    const manifest: { name: string; file: string; url: string }[] = [];
    for (const subgraph of subgraphs) {
      const fileName = `${subgraph.name}.graphql`;
      const filePath = join(subgraphsDir, fileName);
      await fsPromises.writeFile(filePath, print(subgraph.typeDefs), 'utf8');
      manifest.push({
        name: subgraph.name,
        file: fileName,
        url: subgraph.url || '',
      });
    }
    await fsPromises.writeFile(
      join(subgraphsDir, 'subgraphs.json'),
      JSON.stringify(manifest, null, 2),
      'utf8',
    );
    log.info(`Wrote ${manifest.length} subgraph SDL(s) to ${subgraphsDir}`);
  }

  log.info('Done!');
}
