import { generateSdk } from '@graphql-mesh/cli';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { getMeshInstance } from '../src/mesh/getMeshInstance';
import InmemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';

const { writeFile } = fsPromises;

async function main() {
  const mesh = await getMeshInstance({
    cache: new InmemoryLRUCache(),
  });
  const sdkCode = await generateSdk(mesh.schema, {
    operations: [join(process.cwd(), './mesh-operations/**/*.graphql')],
    'flatten-types': true,
  });
  mesh.destroy();
  await writeFile(join(process.cwd(), './src/mesh/sdk.generated.ts'), sdkCode, 'utf8');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
