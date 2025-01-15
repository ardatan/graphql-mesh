import { createTenv, type Service } from '@e2e/tenv';
import { authors, books } from './services/data';

describe('Cache Control', () => {
  const env = createTenv(__dirname);
  let services: Service[];
  beforeEach(async () => {
    const books = await env.service('books');
    const authors = await env.service('authors');
    services = [authors, books];
  });
  const composition = {
    mesh(maskServicePorts: boolean) {
      return env.compose({
        services,
        maskServicePorts,
        output: 'graphql',
      });
    },
    apollo(maskServicePorts: boolean) {
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
          async function makeQuery() {
            const res = await gw.execute({
              query: /* GraphQL */ `
                query TestQuery {
                  authors {
                    id
                    name
                  }
                  books {
                    id
                    title
                  }
                }
              `,
            });
            expect(res).toEqual({
              data: {
                authors: authors.map(({ id, name }) => ({ id, name })),
                books: books.map(({ id, title }) => ({ id, title })),
              },
            });
          }
          await makeQuery();
          expect(services[0].getStd('both')).toContain('TestQuery: 1');
          expect(services[1].getStd('both')).toContain('TestQuery: 1');
          await makeQuery();
          expect(services[0].getStd('both')).not.toContain('TestQuery: 2');
          expect(services[1].getStd('both')).not.toContain('TestQuery: 2');
        });
      }
    });
  }
});
