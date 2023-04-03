import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI';

describe('Cloudflare', () => {
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('cloudflare', {
      source: `./fixtures/cloudflare.json`,
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot('cloudflare');
  });
});
