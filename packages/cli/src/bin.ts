#!/usr/bin/env node -r ts-node/register/transpile-only

import { MeshConfig } from './config';
import { safeLoad } from 'js-yaml';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { executeMesh } from './mesh';

export async function graphqlMesh() {
  const config = safeLoad(
    readFileSync(resolve(process.cwd(), './mesh.yaml'), 'utf8')
  ) as MeshConfig;

  await executeMesh(config, process.argv[2] === 'serve');
}

graphqlMesh()
  .then(() => {})
  .catch(e => {
    console.error(e);
  });
