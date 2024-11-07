import { createTenv } from '@e2e/tenv';

describe('OpenAPI HATEOAS', () => {
  const { compose, serve, service } = createTenv(__dirname);
  it('composes the schema', async () => {
    const { result } = await compose({ output: 'graphql' });
    expect(result).toMatchSnapshot();
  });
});
