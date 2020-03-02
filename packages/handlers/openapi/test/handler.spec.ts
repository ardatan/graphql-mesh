import { EventEmitter } from 'tsee';
import { printSchema } from 'graphql';
import handler from '../src';

describe('openapi', () => {
  it('should create a GraphQL schema from a simple local swagger file', async () => {
    const source = await handler.getMeshSource({
      filePathOrUrl: './test/fixtures/instagram.json',
      name: 'Instagram',
      config: {},
      hooks: new EventEmitter()
    });

    expect(printSchema(source.schema)).toMatchSnapshot();
  });
});
