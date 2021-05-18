import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import GraphQLHandler from '../src';
import { PubSub } from 'graphql-subscriptions';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { buildSchema, introspectionFromSchema } from 'graphql';

describe('graphql', () => {
  it('handle SDL files correctly as endpoint', async () => {
    const sdlFilePath = './fixtures/schema.graphql';
    const handler = new GraphQLHandler({
      name: 'SDLSchema',
      config: {
        endpoint: sdlFilePath,
      },
      baseDir: __dirname,
      cache: new InMemoryLRUCache(),
      introspectionCache: {},
      pubsub: new PubSub(),
    });
    const absoluteFilePath = join(__dirname, sdlFilePath);
    const schemaStringFromFile = await readFile(absoluteFilePath, 'utf-8');
    const schemaFromFile = buildSchema(schemaStringFromFile);
    const { schema: schemaFromHandler } = await handler.getMeshSource();
    expect(introspectionFromSchema(schemaFromHandler)).toBe(introspectionFromSchema(schemaFromFile));
  });
});
