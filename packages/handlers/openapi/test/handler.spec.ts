import { EventEmitter } from 'tsee';
import { printSchema } from 'graphql';
import handler from '../src';

describe('openapi', () => {
  it('should create a GraphQL schema from a simple local swagger file', async () => {
    const source = await handler.getMeshSource({
      name: 'Instagram',
      handler: {
        name: 'openapi',
        source: './test/fixtures/instagram.json'
      },
      hooks: new EventEmitter()
    });

    expect(printSchema(source.schema)).toMatchSnapshot();
  });
});
