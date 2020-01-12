#!/usr/bin/env node

import { MeshConfig } from './config';
import { safeLoad } from 'js-yaml';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { executeMesh } from './mesh';

export async function graphqlMesh() {
  const config = safeLoad(
    readFileSync(resolve(process.cwd(), './mesh.yaml'), 'utf8')
  ) as MeshConfig;

  await executeMesh(config);
}

graphqlMesh().then(() => {
  console.log('Done')
}).catch(e => {
  console.error(e);
})