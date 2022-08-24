import { printSchemaWithDirectives } from '@graphql-tools/utils';
import loadGraphQLSchemaFromOpenAPI, { createBundle } from '../src';

describe('Jira', () => {
  it('should generate the correct bundle', async () => {
    const bundle = await createBundle('jira', {
      source: './fixtures/jira.json',
      cwd: __dirname,
    });
    expect(bundle).toMatchSnapshot();
  });
  it('should generate the correct schema', async () => {
    const schema = await loadGraphQLSchemaFromOpenAPI('jira', {
      source: './fixtures/jira.json',
      cwd: __dirname,
    });
    expect(printSchemaWithDirectives(schema)).toMatchSnapshot();
  });
});
