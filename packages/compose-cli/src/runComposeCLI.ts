/* eslint-disable import/no-nodejs-modules */
import { promises as fsPromises } from 'fs';
import { isAbsolute, join } from 'path';
import { parse } from 'graphql';
import Spinnies from 'spinnies';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { getComposedSchemaFromConfig } from './getComposedSchemaFromConfig.js';
import { MeshComposeCLIConfig } from './types.js';

export const spinnies = new Spinnies({
  color: 'white',
  succeedColor: 'white',
  failColor: 'red',
  succeedPrefix: '✔',
  failPrefix: '💥',
  spinner: { interval: 80, frames: ['/', '|', '\\', '--'] },
});

export interface RunComposeCLIOpts {
  defaultConfigFileName?: string;
  defaultConfigFilePath?: string;
  productName?: string;
  processExit?: (exitCode: number) => void;
}

const defaultProcessExit = (exitCode: number) => process.exit(exitCode);

export async function runComposeCLI({
  defaultConfigFileName = 'mesh.config.ts',
  defaultConfigFilePath = process.cwd(),
  productName = 'Mesh Compose CLI',
  processExit = defaultProcessExit,
}: RunComposeCLIOpts = {}): Promise<void | never> {
  spinnies.add('main', { text: 'Starting ' + productName });
  const meshComposeCLIConfigFileName =
    process.env.MESH_COMPOSE_CONFIG_FILE_NAME || defaultConfigFileName;
  const meshComposeCLIConfigFilePath =
    process.env.MESH_COMPOSE_CONFIG_FILE_PATH ||
    join(defaultConfigFilePath, meshComposeCLIConfigFileName);
  spinnies.add('config', {
    text: `Loading ${productName} Config from ${meshComposeCLIConfigFilePath}`,
  });
  const loadedConfig: { composeConfig: MeshComposeCLIConfig } = await import(
    meshComposeCLIConfigFilePath
  );
  const meshComposeCLIConfig = loadedConfig.composeConfig;
  if (!meshComposeCLIConfig) {
    spinnies.fail('config', {
      text: `${productName} Config was not found in ${meshComposeCLIConfigFilePath}`,
    });
    return processExit(1);
  }
  spinnies.succeed('config', {
    text: `Loaded ${productName} Config from ${meshComposeCLIConfigFilePath}`,
  });

  const composedSchema = await getComposedSchemaFromConfig(meshComposeCLIConfig, spinnies);

  spinnies.add('write', { text: `Writing Fusiongraph` });
  const printedSupergraph = printSchemaWithDirectives(composedSchema);

  const fusiongraphFileName = meshComposeCLIConfig.target;

  if (!fusiongraphFileName) {
    if (typeof process === 'object') {
      process.stdout.write(printedSupergraph + '\n');
    } else {
      console.log(printedSupergraph);
    }
    spinnies.succeed('write', { text: 'Written fusiongraph to stdout' });
    spinnies.succeed('main', { text: 'Finished ' + productName });
    return;
  }

  const fusiongraphPath = isAbsolute(fusiongraphFileName)
    ? join(process.cwd(), fusiongraphFileName)
    : fusiongraphFileName;

  let writtenData: string;
  if (fusiongraphPath.endsWith('.json')) {
    writtenData = JSON.stringify(parse(printedSupergraph, { noLocation: true }), null, 2);
  } else if (
    fusiongraphPath.endsWith('.graphql') ||
    fusiongraphPath.endsWith('.gql') ||
    fusiongraphPath.endsWith('.graphqls') ||
    fusiongraphPath.endsWith('.gqls')
  ) {
    writtenData = printedSupergraph;
  } else if (
    fusiongraphPath.endsWith('.ts') ||
    fusiongraphPath.endsWith('.cts') ||
    fusiongraphPath.endsWith('.mts') ||
    fusiongraphPath.endsWith('.js') ||
    fusiongraphPath.endsWith('.cjs') ||
    fusiongraphPath.endsWith('.mjs')
  ) {
    writtenData = `export default ${JSON.stringify(printedSupergraph)}`;
  } else {
    console.error(`Unsupported file extension for ${fusiongraphPath}`);
    return processExit(1);
  }
  await fsPromises.writeFile(fusiongraphPath, writtenData, 'utf8');
  spinnies.succeed('write', { text: `Written fusiongraph to ${fusiongraphPath}` });
  spinnies.succeed('main', { text: 'Finished ' + productName });
}
