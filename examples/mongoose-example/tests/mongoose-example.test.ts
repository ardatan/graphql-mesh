import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';
import { basename, join } from 'path';

import { introspectionFromSchema, lexicographicSortSchema } from 'graphql';
import { loadDocuments } from '@graphql-tools/load';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';

describe('Mongoose', () => {
  const config$ = findAndParseConfig({
    dir: join(__dirname, '..'),
  });
  const mesh$ = config$.then(config => getMesh(config));
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      introspectionFromSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot();
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
