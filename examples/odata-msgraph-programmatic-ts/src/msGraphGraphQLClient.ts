import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';

export async function getMsGraphGraphQLClient() {
  const config = await findAndParseConfig({
    dir: join(__dirname, '..'),
  });
  const mesh = await getMesh(config);
  return mesh;
}
