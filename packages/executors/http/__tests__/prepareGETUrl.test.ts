import { prepareGETUrl } from '../src/prepareGETUrl.js';

describe('prepareGETUrl', () => {
  it('removes a stale query param when body.query is absent', () => {
    const url = prepareGETUrl({
      baseUrl: '/graphql?query=OLD&keep=1',
      body: {
        extensions: { persistedQuery: { version: 1, sha256Hash: 'abc' } },
      },
    });
    expect(url).toContain('keep=1');
    expect(url).not.toContain('query=OLD');
    expect(url).toContain('extensions=');
  });

  it('replaces query when body.query is present', () => {
    const url = prepareGETUrl({
      baseUrl: '/graphql?query=OLD',
      body: { query: '{ hello }' },
    });
    expect(url).toMatch(/query=%7B[+%20]hello[+%20]%7D/);
    expect(url).not.toContain('OLD');
  });

  it('treats http-graphql as a relative path, not an absolute URL', () => {
    const url = prepareGETUrl({
      baseUrl: 'http-graphql',
      body: { query: '{ hello }' },
    });
    expect(url.startsWith('http-graphql') || url.startsWith('/http-graphql')).toBe(true);
    expect(url).not.toMatch(/^https?:\/\/http-graphql/);
  });

  it('preserves caller-supplied absolute http(s) origins', () => {
    const url = prepareGETUrl({
      baseUrl: 'https://api.example.com/graphql',
      body: { query: '{ hello }' },
    });
    expect(url.startsWith('https://api.example.com/graphql')).toBe(true);
  });

  it('strips the dummy origin only for relative endpoints', () => {
    const relative = prepareGETUrl({
      baseUrl: '/graphql',
      body: { query: '{ hello }' },
    });
    expect(relative.startsWith('/graphql')).toBe(true);
    expect(relative).not.toContain('dummyhostname');
  });
});
