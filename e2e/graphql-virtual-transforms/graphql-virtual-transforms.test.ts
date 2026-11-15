import { createTenv, type ServeRunner, type Service } from '@e2e/tenv';

/**
 * Dual annotation: Mesh `@merge`/`@source` for Hive + virtual `@connect` for Router.
 * GraphQL only — no OpenAPI.
 */
describe('GraphQL dual @merge + virtual @connect (no OpenAPI)', () => {
  jest.retryTimes(3);
  const { compose, serve, service } = createTenv(__dirname);

  let books: Service;
  let authors: Service;
  let authorsFed: Service;

  beforeAll(async () => {
    books = await service('books');
    authors = await service('authors');
    authorsFed = await service('authors-fed');
  });

  describe('virtualConnect dual annotation on plain GraphQL authors', () => {
    it('composes @merge and @connect(entity:true) on author; keeps Mesh @source for books rename', async () => {
      const { result } = await compose({
        output: 'graphql',
        services: [authors, books],
        maskServicePorts: true,
        env: { MESH_SPIKE_MODE: 'virtual' },
      });
      expect(result).toMatchSnapshot();
      const authorField = result.match(/author\(id:\s*ID!\):\s*Author[^\n]*/)?.[0] || '';
      expect(authorField).toMatch(/@merge\(/);
      expect(authorField).toMatch(/name:\s*"connect"/);
      expect(authorField).toMatch(/entity:\s*true/);
      expect(result).not.toMatch(/@resolveTo\(/);
      // Books rename → `@meshSource` (aliased so Router won't parse Mesh `@source` as Apollo).
      expect(result).toMatch(/@meshSource\(/);
      expect(result).not.toMatch(/transport-rest/);
    });

    it('on hive: @merge still fills author.name from GraphQL', async () => {
      const composition = await compose({
        output: 'graphql',
        services: [authors, books],
        env: { MESH_SPIKE_MODE: 'virtual' },
      });
      const { execute } = await serve({
        runner: 'hive',
        supergraph: composition.output,
      });
      const queryResult = await execute({
        query: /* GraphQL */ `
          query {
            book(id: "0") {
              id
              title
              author {
                id
                name
              }
            }
          }
        `,
      });
      expect(queryResult.errors).toBeFalsy();
      expect(queryResult.data).toEqual({
        book: {
          id: '0',
          title: 'Lorem Ipsum',
          author: {
            id: '1',
            name: 'Jane Doe',
          },
        },
      });
    });

    it('on apollo-router: SDL carries virtual @connect; GraphQL name fill still not via virtual', async () => {
      const composition = await compose({
        output: 'graphql',
        services: [authors, books],
        env: { MESH_SPIKE_MODE: 'virtual' },
      });
      expect(composition.result).toMatch(/name:\s*"connect"/);
      expect(composition.result).toMatch(/@merge\(/);
      const servePromise = serve({
        runner: 'apollo-router' satisfies ServeRunner,
        supergraph: composition.output,
      });
      try {
        const { execute } = await servePromise;
        const queryResult = await execute({
          query: /* GraphQL */ `
            query {
              book(id: "0") {
                id
                author {
                  id
                  name
                }
              }
            }
          `,
        });
        // Router ignores Mesh @merge; virtual connect cannot HTTP GraphQL for name.
        expect(queryResult.data?.book?.author?.name ?? null).toBeNull();
      } catch (err) {
        expect(String(err)).toMatch(/500|INTERNAL_SERVER_ERROR|Connector|error/i);
      }
    });
  });

  describe('Federation authors control (no dual needed)', () => {
    it('fills author.name on hive + apollo-router via _entities', async () => {
      const composition = await compose({
        output: 'graphql',
        services: [authorsFed, books],
        env: { MESH_SPIKE_MODE: 'federation' },
      });
      for (const runner of ['hive', 'apollo-router'] as ServeRunner[]) {
        const { execute } = await serve({
          runner,
          supergraph: composition.output,
        });
        const queryResult = await execute({
          query: /* GraphQL */ `
            query {
              book(id: "0") {
                author {
                  id
                  name
                }
              }
            }
          `,
        });
        expect(queryResult.errors).toBeFalsy();
        expect(queryResult.data).toEqual({
          book: {
            author: {
              id: '1',
              name: 'Jane Doe',
            },
          },
        });
      }
    });
  });
});
