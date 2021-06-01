import { findAndParseConfig } from '@graphql-mesh/config';
import { getMesh } from '@graphql-mesh/runtime';
import { basename, join } from 'path';
import { introspectionFromSchema, lexicographicSortSchema } from 'graphql';

describe('Hello World', () => {
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
    const result = await execute(/* GraphQL */ `
      query HelloWorld {
        greeting
      }
    `);
    expect(result?.errors).toBeFalsy();
    expect(result).toMatchSnapshot();
  });
  afterAll(() => mesh$.then(mesh => mesh.destroy()));
});
