import { setTimeout } from 'node:timers/promises';
import { createTenv, type Service } from '@e2e/tenv';
import { authors, books, comments } from './services/data';

describe('Cache Control', () => {
  const env = createTenv(__dirname);
  let services: Service[];
  const composition = {
    async mesh(maskServicePorts: boolean) {
      const books = await env.service('books');
      const authors = await env.service('authors');
      const comments = await env.service('comments');
      services = [authors, books, comments];
      return env.compose({
        services,
        maskServicePorts,
        output: 'graphql',
      });
    },
    async apollo(maskServicePorts: boolean) {
      const books = await env.service('books');
      const authors = await env.service('authors');
      const comments = await env.service('comments');
      services = [authors, books, comments];
      return env.composeWithApollo({
        services,
        maskServicePorts,
      });
    },
  };
  for (const [name, compose] of Object.entries(composition)) {
    describe(`Composition With ${name}`, () => {
      it('composed correctly', async () => {
        const { result } = await compose(true);
        expect(result).toMatchSnapshot(name);
      });
      const cacheMethod = ['HTTP_CACHE', 'RESPONSE_CACHE'];
      for (const method of cacheMethod) {
        it('caches correctly with ' + method, async () => {
          const { output } = await compose(false);
          const gw = await env.serve({
            supergraph: output,
            env: {
              [method]: 'true',
            },
          });
          async function makeQueries() {
            const queries = {
              AUTHORS_TEST_1: {
                query: /* GraphQL */ `
                  query AUTHORS_TEST_1 {
                    authors {
                      id
                      name
                    }
                  }
                `,
                expected: {
                  authors: authors.map(({ id, name }) => ({ id, name })),
                },
              },
              // We make 2 queries to the same field to ensure that the cache is working
              // seperately for each query
              AUTHORS_TEST_2: {
                query: /* GraphQL */ `
                  query AUTHORS_TEST_2 {
                    authors {
                      id
                      name
                      age
                    }
                  }
                `,
                expected: {
                  authors: authors.map(({ id, name, age }) => ({ id, name, age })),
                },
              },
              BOOKS_TEST_1: {
                query: /* GraphQL */ `
                  query BOOKS_TEST_1 {
                    books {
                      id
                      title
                    }
                  }
                `,
                expected: {
                  books: books.map(({ id, title }) => ({ id, title })),
                },
              },
              COMMENTS_TEST_1: {
                query: /* GraphQL */ `
                  query COMMENTS_TEST_1 {
                    comments {
                      id
                      content
                    }
                  }
                `,
                expected: {
                  comments: comments.map(({ id, content }) => ({ id, content })),
                },
              },
            };
            for (const name in queries) {
              const { query, expected } = queries[name];
              const { data } = await gw.execute({ query });
              expect(data).toEqual(expected);
            }
          }
          const [authorsService, booksService, commentsService] = services;
          // Store the results to the cache that will take 30s
          await makeQueries();
          expect(authorsService.getStd('both')).toContain('AUTHORS_TEST_1: 1');
          expect(authorsService.getStd('both')).toContain('AUTHORS_TEST_2: 1');
          expect(booksService.getStd('both')).toContain('BOOKS_TEST_1: 1');
          expect(commentsService.getStd('both')).toContain('COMMENTS_TEST_1: 1');
          await makeQueries();
          // Results did not expire yet
          expect(authorsService.getStd('both')).not.toContain('AUTHORS_TEST_1: 2');
          expect(authorsService.getStd('both')).not.toContain('AUTHORS_TEST_2: 2');
          expect(booksService.getStd('both')).not.toContain('BOOKS_TEST_1: 2');
          expect(commentsService.getStd('both')).not.toContain('COMMENTS_TEST_1: 2');
          // Comment has been expired
          await setTimeout(5_000);
          await makeQueries();
          expect(authorsService.getStd('both')).not.toContain('AUTHORS_TEST_1: 2');
          expect(authorsService.getStd('both')).not.toContain('AUTHORS_TEST_2: 2');
          expect(booksService.getStd('both')).not.toContain('BOOKS_TEST_1: 2');
          expect(commentsService.getStd('both')).toContain('COMMENTS_TEST_1: 2');
          // All results have been expired
          await setTimeout(5_000);
          await makeQueries();
          expect(authorsService.getStd('both')).toContain('AUTHORS_TEST_1: 2');
          expect(authorsService.getStd('both')).toContain('AUTHORS_TEST_2: 2');
          expect(booksService.getStd('both')).toContain('BOOKS_TEST_1: 2');
          expect(commentsService.getStd('both')).toContain('COMMENTS_TEST_1: 3');
        });
      }
    });
  }
});
