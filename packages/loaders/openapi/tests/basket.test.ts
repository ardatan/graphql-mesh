import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI, { createBundle } from '../src';

describe('Basket', () => {
  it('should generate the correct bundle', async () => {
    const bundle = await createBundle('basket', {
      source: './fixtures/basket.json',
      cwd: __dirname,
    });
    expect(bundle).toMatchSnapshot();
  });
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('basket', {
      source: './fixtures/basket.json',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
