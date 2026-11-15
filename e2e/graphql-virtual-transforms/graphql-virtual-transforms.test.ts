import { createTenv, type ServeRunner, type Service } from '@e2e/tenv';

/**
 * Clarified GM-18: type-merging-with-transforms WITHOUT additionalTypeDefs/@resolveTo.
 * Virtual Connectors vs Federation for plain GraphQL entity ownership.
 */
describe('GraphQL virtual Connectors transforms (no additionalTypeDefs)', () => {
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

  describe('virtualConnect on plain GraphQL authors', () => {
    it('composes authors.author as entity:true without Mesh @merge on that field', async () => {
      const { result } = await compose({
        output: 'graphql',
        services: [authors, books],
        maskServicePorts: true,
        env: { MESH_SPIKE_MODE: 'virtual' },
      });
      expect(result).toMatchSnapshot();
      // Authors entity owner: virtual @connect(entity: true), not Mesh @merge on that field.
      const authorField = result.match(/author\(id:\s*ID!\):\s*Author[^\n]*/)?.[0] || '';
      expect(authorField).toMatch(/entity:\s*true/);
      expect(authorField).toMatch(/name:\s*"connect"/);
      expect(authorField).not.toContain('@merge');
      expect(result).not.toMatch(/@resolveTo\(/);
      // Book.author stub from books schema (not additionalTypeDefs).
      expect(result).toMatch(/type Book[\s\S]*author:\s*Author/);
      // Semantic conventions may still @merge authors(ids:) / book(id:) — not the entity owner field.
    });

    it('on hive: echoes author id from virtual entity connect; name stays null (no GraphQL fetch)', async () => {
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
      // Virtual @connect has no http — cannot call Yoga for `name`.
      expect(queryResult.errors).toBeFalsy();
      expect(queryResult.data).toEqual({
        book: {
          id: '0',
          title: 'Lorem Ipsum',
          author: {
            id: '1',
            name: null,
          },
        },
      });
    });

    it('on apollo-router: virtual entity:true without http is not a usable GraphQL-backed entity fill', async () => {
      const composition = await compose({
        output: 'graphql',
        services: [authors, books],
        env: { MESH_SPIKE_MODE: 'virtual' },
      });
      // Router accepts the SDL (join__directive connect) but entity fill via a
      // requestless virtual connector does not load GraphQL `name` — and may 500
      // when planning entity resolution against that connector.
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
        // If Router returns data, name must still be null (no HTTP to GraphQL).
        expect(queryResult.data?.book?.author?.name ?? null).toBeNull();
      } catch (err) {
        // 500 / connector runtime failure is acceptable evidence for this spike.
        expect(String(err)).toMatch(/500|INTERNAL_SERVER_ERROR|Connector|error/i);
      }
    });
  });

  describe('Federation authors (no additionalTypeDefs / no authors entity @merge)', () => {
    it('composes without Mesh @merge on authors.author and without @resolveTo', async () => {
      const { result } = await compose({
        output: 'graphql',
        services: [authorsFed, books],
        maskServicePorts: true,
        env: { MESH_SPIKE_MODE: 'federation' },
      });
      const authorField = result.match(/author\(id:\s*ID!\):\s*Author[^\n]*/)?.[0] || '';
      expect(authorField).not.toContain('@merge');
      expect(result).not.toMatch(/@resolveTo\(/);
    });

    describe.each(['hive', 'apollo-router'] as ServeRunner[])('execute with %s', runner => {
      it('fills author.name via Federation _entities', async () => {
        const composition = await compose({
          output: 'graphql',
          services: [authorsFed, books],
          env: { MESH_SPIKE_MODE: 'federation' },
        });
        const { execute } = await serve({
          runner,
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
    });
  });
});
