import { SupergraphSchemaManager } from '../src/managed-federation.js';

describe('SupergraphSchemaManager polling ownership', () => {
  it('invalidates pending fetches when stop() is called', async () => {
    let resolveFetch!: (value: any) => void;
    const fetchPromise = new Promise(resolve => {
      resolveFetch = resolve;
    });

    const manager = new SupergraphSchemaManager({
      minDelaySeconds: 0.01,
      fetch: async () => {
        await fetchPromise;
        return new Response(
          JSON.stringify({
            data: {
              routerConfig: {
                __typename: 'RouterConfigResult',
                id: '1',
                supergraphSdl: 'type Query { hello: String }',
                minDelaySeconds: 0.01,
                messages: [],
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    } as any);

    let schemaEvents = 0;
    manager.addEventListener('schema', () => {
      schemaEvents++;
    });

    manager.forcePull();
    manager.stop();
    resolveFetch({});

    // Allow any in-flight continuation to run.
    await new Promise(r => setTimeout(r, 50));
    expect(schemaEvents).toBe(0);
  });
});
