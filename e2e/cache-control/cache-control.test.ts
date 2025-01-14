import { createTenv, type Service } from '@e2e/tenv';

describe('Cache Control', () => {
  const env = createTenv(__dirname);
  let services: Service[];
  beforeAll(async () => {
    const books = await env.service('books');
    const authors = await env.service('authors');
    services = [books, authors];
  });
  it('composes with Mesh', async () => {
    const { result } = await env.compose({
      services,
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot('mesh');
  });
  it('composes with Apollo', async () => {
    const { result } = await env.composeWithApollo({
      services,
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot('apollo');
  });
});
