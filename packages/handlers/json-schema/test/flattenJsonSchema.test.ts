import { JSONSchemaObject } from '@json-schema-tools/meta-schema';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { join } from 'path';
import { flattenJSONSchema } from '../src/utils';

describe('flattenJSONSchema', () => {
  it('should replace $ref with actual definitions in the same schema by keeping object references', async () => {
    const inputSchema = {
      title: 'PostsResponse',
      type: 'array',
      items: {
        $ref: '#/definitions/Post',
      },
      definitions: {
        Author: {
          type: 'object',
          title: 'Author',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            posts: {
              type: 'array',
              items: {
                $ref: '#/definitions/Post',
              },
            },
          },
        },
        Post: {
          type: 'object',
          title: 'Post',
          properties: {
            id: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            content: {
              type: 'string',
            },
            author: {
              $ref: '#/definitions/Author',
            },
          },
        },
      },
    };
    const result = (await flattenJSONSchema(inputSchema, new InMemoryLRUCache(), {
      cwd: join(__dirname, './fixtures'),
    })) as JSONSchemaObject;
    expect((result.items as any).title).toBe('Post');
    expect((result.items as any).properties === result.definitions.Post.properties).toBeTruthy();
    expect(result.definitions.Post.properties.author.title).toBe('Author');
    expect(result.definitions.Post.properties.author.properties === result.definitions.Author.properties).toBeTruthy();
    expect(
      result.definitions.Author.properties.posts.items.properties === result.definitions.Post.properties
    ).toBeTruthy();
  });
  it('should collect external schema sources, bundle them and resolve the references by keeping object references', async () => {
    const result = (await flattenJSONSchema('PostsResponse.json', new InMemoryLRUCache(), {
      cwd: join(__dirname, './fixtures'),
    })) as JSONSchemaObject;
    expect(result.title).toBe('PostsResponse');
    expect(result.properties.items.items.title).toBe('Post');
    expect(result.properties.items.items.properties).toBe(
      result.properties.items.items.properties.author.properties.posts.items.properties
    );
  });
  it('should recognize json pointers as an input', async () => {
    const result = (await flattenJSONSchema('Post.json#/definitions/Post', new InMemoryLRUCache(), {
      cwd: join(__dirname, './fixtures'),
    })) as JSONSchemaObject;
    expect(result.title).toBe('Post');
    expect(result.properties.author.title).toBe('Author');
  });
});
