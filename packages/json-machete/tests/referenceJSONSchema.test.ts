import type { JSONSchemaObject } from '@json-schema-tools/meta-schema';
import { referenceJSONSchema } from '../src/referenceJSONSchema.js';

describe('referenceJSONSchema', () => {
  it('should create definitions under definitions prop and put references in other places', async () => {
    const Post: JSONSchemaObject = {
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
      },
    };
    const Author = {
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
          items: Post,
        },
      },
    };
    Post.properties.author = Author;
    const result = await referenceJSONSchema({
      type: 'object',
      title: 'Container',
      properties: {
        authors: {
          type: 'array',
          items: Author,
        },
        posts: {
          type: 'array',
          items: Post,
        },
      },
    });
    expect(result).toStrictEqual({
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
    });
  });
});
