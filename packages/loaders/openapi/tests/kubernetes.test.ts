import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI, { createBundle } from '../src';

describe('OpenAPI Loader: Kubernetes', () => {
  it('should generate the correct bundle', async () => {
    const bundle = await createBundle('kubernetes', {
      source: './fixtures/kubernetes.json',
      cwd: __dirname,
    });
    expect(bundle).toMatchSnapshot();
  });
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('kubernetes', {
      source: './fixtures/kubernetes.json',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
