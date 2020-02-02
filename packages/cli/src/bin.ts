#!/usr/bin/env node -r ts-node/register/transpile-only

import { MeshConfig } from './config';
import { executeMesh } from './mesh';
import { cosmiconfig } from 'cosmiconfig';

export async function graphqlMesh() {
  const explorer = await cosmiconfig('mesh');
  const results = await explorer.search(process.cwd());
  const config = results?.config as MeshConfig;

  if (!config) {
    throw new Error(`Unable to find GraphQL Mesh configuration file!`);
  }

  await executeMesh(config, process.argv[2] === 'serve');
}

graphqlMesh()
  .then(() => {})
  .catch(e => {
    console.error(e);
  });
