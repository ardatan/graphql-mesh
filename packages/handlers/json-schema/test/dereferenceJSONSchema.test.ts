import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { dereferenceJSONSchema } from '../src/utils/dereferenceJSONSchema';

describe('dereferenceJSONSchema', () => {
  it('should resolve all $ref', async () => {
    const schema = {
      $ref: '#/definitions/Container',
      definitions: {
        Container: {
          type: 'object',
          title: 'Container',
          properties: {
            authors: {
              type: 'array',
              items: {
                $ref: '#/definitions/Author',
              },
            },
            posts: {
              type: 'array',
              items: {
                $ref: '#/definitions/Post',
              },
            },
          },
        },
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
    const result = await dereferenceJSONSchema(schema, new InMemoryLRUCache(), {});
    expect(result.title).toBe('Container');
    expect(result.properties.posts.items.title).toBe('Post');
    expect(result.properties.posts.items.properties.author.title).toBe('Author');
    expect(result.properties.posts.items.properties.author === result.properties.authors.items).toBeTruthy();
  });
  it('should dereference external references', async () => {
    const result = await dereferenceJSONSchema('./fixtures/PostsResponse.json', new InMemoryLRUCache(), {
      cwd: __dirname,
    });
    expect(result.title).toBe('PostsResponse');
    expect(result.properties.items.items.title).toBe('Post');
    expect(result.properties.items.items.properties.author.title).toBe('Author');
  });
});
