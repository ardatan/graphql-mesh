/* eslint-disable import/no-nodejs-modules */
import { promises as fsPromises } from 'fs';
import { isAbsolute, join } from 'path';
import { parse } from 'graphql';
import Spinnies from 'spinnies';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { getComposedSchemaFromConfig } from './getComposedSchemaFromConfig.js';
import { MeshComposeCLIConfig } from './types';

export const spinnies = new Spinnies({
  color: 'white',
  succeedColor: 'white',
  failColor: 'red',
  succeedPrefix: '✔',
  failPrefix: '💥',
  spinner: { interval: 80, frames: ['/', '|', '\\', '--'] },
});

export async function runComposeCLI(
  processExit = (exitCode: number) => process.exit(exitCode),
): Promise<void | never> {
  spinnies.add('main', { text: 'Starting Mesh Compose CLI' });
  const meshComposeCLIConfigFileName = process.env.MESH_DEV_CONFIG_FILE_NAME || 'mesh.config.ts';
  const meshComposeCLIConfigFilePath =
    process.env.MESH_DEV_CONFIG_FILE_PATH || join(process.cwd(), meshComposeCLIConfigFileName);
  spinnies.add('config', {
    text: `Loading Mesh Compose CLI Config from ${meshComposeCLIConfigFilePath}`,
  });
  const loadedConfig: { composeConfig: MeshComposeCLIConfig } = await import(
    meshComposeCLIConfigFilePath
  );
  const meshComposeCLIConfig = loadedConfig.composeConfig;
  if (!meshComposeCLIConfig) {
    spinnies.fail('config', {
      text: `Mesh Compose CLI Config was not found in ${meshComposeCLIConfigFilePath}`,
    });
    return processExit(1);
  }
  spinnies.succeed('config', {
    text: `Loaded Mesh Compose CLI Config from ${meshComposeCLIConfigFilePath}`,
  });

  const composedSchema = await getComposedSchemaFromConfig(meshComposeCLIConfig, spinnies);

  spinnies.add('write', { text: `Writing supergraph` });
  const printedSupergraph = printSchemaWithDirectives(composedSchema);

  const supergraphFileName = meshComposeCLIConfig.target || './supergraph.graphql';
  const supergraphPath = isAbsolute(supergraphFileName)
    ? join(process.cwd(), supergraphFileName)
    : supergraphFileName;

  let writtenData: string;
  if (supergraphPath.endsWith('.json')) {
    writtenData = JSON.stringify(parse(writtenData, { noLocation: true }), null, 2);
  } else if (
    supergraphPath.endsWith('.graphql') ||
    supergraphPath.endsWith('.gql') ||
    supergraphPath.endsWith('.graphqls') ||
    supergraphPath.endsWith('.gqls')
  ) {
    writtenData = printedSupergraph;
  } else if (
    supergraphPath.endsWith('.ts') ||
    supergraphPath.endsWith('.cts') ||
    supergraphPath.endsWith('.mts') ||
    supergraphPath.endsWith('.js') ||
    supergraphPath.endsWith('.cjs') ||
    supergraphPath.endsWith('.mjs')
  ) {
    writtenData = `export default ${JSON.stringify(printedSupergraph)}`;
  } else {
    console.error(`Unsupported file extension for ${supergraphPath}`);
    return processExit(1);
  }
  await fsPromises.writeFile(supergraphPath, writtenData, 'utf8');
  spinnies.succeed('write', { text: `Written supergraph to ${supergraphPath}` });
  spinnies.succeed('main', { text: 'Finished Mesh Compose CLI' });
}
