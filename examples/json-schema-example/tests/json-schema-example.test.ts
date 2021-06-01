import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';
import { basename, join } from 'path';

import { introspectionFromSchema, lexicographicSortSchema } from 'graphql';
import { readFile } from 'fs-extra';

describe('JSON Schema Example', () => {
  const mesh$ = findAndParseConfig({
    dir: join(__dirname, '..'),
  }).then(config => getMesh(config));
  it('should generate correct schema', async () => {
    const { schema } = await mesh$;
    expect(
      introspectionFromSchema(lexicographicSortSchema(schema), {
        descriptions: false,
      })
    ).toMatchSnapshot();
  });
  it('should give correct response', async () => {
    const { execute } = await mesh$;
    const query = await readFile(join(__dirname, '../example-query.graphql'), 'utf8');
    const result = await execute(query);
    expect(result?.data?.me?.firstName).toBeDefined();
    expect(result?.data?.me?.jobTitle).toBeDefined();
    expect(result?.data?.me?.lastName).toBeDefined();
    expect(result?.data?.me?.company?.name).toBeDefined();
    expect(result?.data?.me?.company?.type).toBeDefined();
    expect(result?.data?.me?.company?.employers).toHaveLength(2);
    expect(result?.data?.me?.company?.employers[0]?.firstName).toBeDefined();
    expect(result?.data?.me?.company?.employers[0]?.jobTitle).toBeDefined();
    expect(result?.data?.me?.company?.employers[0]?.lastName).toBeDefined();
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
