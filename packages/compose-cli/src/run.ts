import 'tsx/cjs'; // support importing typescript configs in CommonJS
import 'tsx/esm'; // support importing typescript configs in ESM
import 'dotenv/config'; // inject dotenv options to process.env

// eslint-disable-next-line import/no-nodejs-modules
import { promises as fsPromises } from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import { isAbsolute, join, resolve } from 'path';
import { parse } from 'graphql';
import { Command, Option } from '@commander-js/extra-typings';
import { Logger } from '@graphql-mesh/types';
import { DefaultLogger } from '@graphql-mesh/utils';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { getComposedSchemaFromConfig } from './getComposedSchemaFromConfig.js';
import { MeshComposeCLIConfig } from './types.js';

let program = new Command()
  .addOption(
    new Option('-c, --config-path <path>', 'path to the configuration file')
      .env('CONFIG_PATH')
      .default('mesh.config.ts'),
  )
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

export type ImportedModule<T> = T | { default: T };

export async function run({
  log: rootLog = new DefaultLogger(),
  productName = 'Mesh Compose',
  productDescription = 'compose a GraphQL federated schema from any API service(s)',
  binName = 'mesh-compose',
  version,
}: RunOptions): Promise<void | never> {
  program = program.name(binName).description(productDescription);
  if (version) program = program.version(version);
  if (process.env.NODE_ENV === 'test') program = program.allowUnknownOption();
  const opts = program.parse().opts();

  const log = rootLog.child(`🕸️  ${productName}`);

  const configPath = isAbsolute(opts.configPath)
    ? opts.configPath
    : resolve(process.cwd(), opts.configPath);
  log.info(`Checking configuration at ${configPath}`);
  const importedConfigModule: ImportedModule<{ composeConfig?: MeshComposeCLIConfig }> =
    await import(configPath).catch(err => {
      if (err.code === 'ERR_MODULE_NOT_FOUND') {
        return {}; // no config is ok
      }
      log.error('Loading configuration failed!');
      throw err;
    });

  let importedConfig: MeshComposeCLIConfig;
  if ('default' in importedConfigModule) {
    importedConfig = importedConfigModule.default.composeConfig;
  } else if ('composeConfig' in importedConfigModule) {
    importedConfig = importedConfigModule.composeConfig;
  } else {
    throw new Error(`No configuration found at ${configPath}`);
  }
  log.info('Loaded configuration');

  const config: MeshComposeCLIConfig = {
    ...importedConfig,
    ...opts,
  };

  log.info('Composing');

  const fusiongraphSchema = await getComposedSchemaFromConfig(config, log);
  const fusiongraph = printSchemaWithDirectives(fusiongraphSchema);

  let output = config.output;
  if (!output) {
    if (typeof process === 'object') {
      process.stdout.write(fusiongraph + '\n');
    } else {
      console.log(fusiongraph);
    }
    log.info('Done!');
    return;
  }

  log.info(`Writing schema to ${output}`);

  output = isAbsolute(output) ? output : join(process.cwd(), output);
  let writtenData: string;
  if (output.endsWith('.json')) {
    writtenData = JSON.stringify(parse(fusiongraph, { noLocation: true }), null, 2);
  } else if (
    output.endsWith('.graphql') ||
    output.endsWith('.gql') ||
    output.endsWith('.graphqls') ||
    output.endsWith('.gqls')
  ) {
    writtenData = fusiongraph;
  } else if (
    output.endsWith('.ts') ||
    output.endsWith('.cts') ||
    output.endsWith('.mts') ||
    output.endsWith('.js') ||
    output.endsWith('.cjs') ||
    output.endsWith('.mjs')
  ) {
    writtenData = `export default ${JSON.stringify(fusiongraph)}`;
  } else {
    throw new Error(`Unsupported file extension for ${output}`);
  }
  await fsPromises.writeFile(output, writtenData, 'utf8');

  log.info('Done!');
}
