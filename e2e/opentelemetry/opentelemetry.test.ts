import os from 'os';
import { setTimeout } from 'timers/promises';
import { boolEnv, createTenv, type Container } from '@e2e/tenv';
import { fetch } from '@whatwg-node/fetch';

const { service, serve, container, composeWithApollo, serveRunner } = createTenv(__dirname);

let supergraph!: string;
let jaeger: Container;

const JAEGER_HOSTNAME =
  serveRunner === 'docker' ? (boolEnv('CI') ? '172.17.0.1' : 'host.docker.internal') : 'localhost';

const TEST_QUERY = /* GraphQL */ `
  fragment User on User {
    id
    username
    name
  }

  fragment Review on Review {
    id
    body
  }

  fragment Product on Product {
    inStock
    name
    price
    shippingEstimate
    upc
    weight
  }

  query TestQuery {
    users {
      ...User
      reviews {
        ...Review
        product {
          ...Product
          reviews {
            ...Review
            author {
              ...User
              reviews {
                ...Review
                product {
                  ...Product
                }
              }
            }
          }
        }
      }
    }
    topProducts {
      ...Product
      reviews {
        ...Review
        author {
          ...User
          reviews {
            ...Review
            product {
              ...Product
            }
          }
        }
      }
    }
  }
`;

describe('opentelemetry', () => {
  beforeAll(async () => {
    supergraph = await composeWithApollo([
      await service('accounts'),
      await service('inventory'),
      await service('products'),
      await service('reviews'),
    ]);

    jaeger = await container({
      name: 'jaeger',
      image:
        os.platform().toLowerCase() === 'win32'
          ? 'johnnyhuy/jaeger-windows:1809'
          : 'jaegertracing/all-in-one:1.56',
      env: {
        COLLECTOR_OTLP_ENABLED: 'true',
      },
      containerPort: 4318,
      additionalContainerPorts: [16686],
      healthcheck: ['CMD-SHELL', 'wget --spider http://localhost:14269'],
    });
  });

  type JaegerTracesApiResponse = {
    data: Array<{
      traceID: string;
      spans: Array<{
        traceID: string;
        spanID: string;
        operationName: string;
        tags: Array<{ key: string; value: string; type: string }>;
      }>;
    }>;
  };

  async function getJaegerTraces(
    service: string,
    expectedDataLength: number,
  ): Promise<JaegerTracesApiResponse> {
    const url = `http://localhost:${jaeger.additionalPorts[16686]}/api/traces?service=${service}`;

    let res: JaegerTracesApiResponse;
    for (let i = 0; i < 15; i++) {
      res = await fetch(url).then(r => r.json<JaegerTracesApiResponse>());
      if (res.data.length >= expectedDataLength) {
        break;
      }
      await setTimeout(300);
    }

    return res;
  }

  it('should report telemetry metrics correctly to jaeger', async () => {
    const serviceName = 'mesh-e2e-test-1';
    const { execute } = await serve({
      supergraph,
      env: {
        OTLP_EXPORTER_URL: `http://${JAEGER_HOSTNAME}:${jaeger.port}/v1/traces`,
        OTLP_SERVICE_NAME: serviceName,
      },
    });

    await expect(execute({ query: TEST_QUERY })).resolves.toMatchSnapshot();
    const traces = await getJaegerTraces(serviceName, 2);
    expect(traces.data.length).toBe(2);
    const relevantTraces = traces.data.filter(trace =>
      trace.spans.some(span => span.operationName === 'POST /graphql'),
    );
    expect(relevantTraces.length).toBe(1);
    const relevantTrace = relevantTraces[0];
    expect(relevantTrace).toBeDefined();
    expect(relevantTrace?.spans.length).toBe(11);

    expect(relevantTrace?.spans).toContainEqual(
      expect.objectContaining({ operationName: 'POST /graphql' }),
    );
    expect(relevantTrace?.spans).toContainEqual(
      expect.objectContaining({ operationName: 'graphql.parse' }),
    );
    expect(relevantTrace?.spans).toContainEqual(
      expect.objectContaining({ operationName: 'graphql.validate' }),
    );
    expect(relevantTrace?.spans).toContainEqual(
      expect.objectContaining({ operationName: 'graphql.execute' }),
    );
    expect(
      relevantTrace?.spans.filter(r => r.operationName === 'subgraph.execute (accounts)').length,
    ).toBe(2);
    expect(
      relevantTrace?.spans.filter(r => r.operationName === 'subgraph.execute (products)').length,
    ).toBe(2);
    expect(
      relevantTrace?.spans.filter(r => r.operationName === 'subgraph.execute (inventory)').length,
    ).toBe(1);
    expect(
      relevantTrace?.spans.filter(r => r.operationName === 'subgraph.execute (reviews)').length,
    ).toBe(2);
  });

  it('should report parse failures correctly', async () => {
    const serviceName = 'mesh-e2e-test-2';
    const { execute } = await serve({
      supergraph,
      env: {
        OTLP_EXPORTER_URL: `http://${JAEGER_HOSTNAME}:${jaeger.port}/v1/traces`,
        OTLP_SERVICE_NAME: serviceName,
      },
    });

    await expect(execute({ query: 'query { test' })).rejects.toMatchSnapshot();
    const traces = await getJaegerTraces(serviceName, 2);
    expect(traces.data.length).toBe(2);
    const relevantTrace = traces.data.find(trace =>
      trace.spans.some(span => span.operationName === 'POST /graphql'),
    );
    expect(relevantTrace).toBeDefined();
    expect(relevantTrace?.spans.length).toBe(2);

    expect(relevantTrace?.spans).toContainEqual(
      expect.objectContaining({ operationName: 'POST /graphql' }),
    );
    expect(relevantTrace?.spans).toContainEqual(
      expect.objectContaining({
        operationName: 'graphql.parse',
        tags: expect.arrayContaining([
          expect.objectContaining({
            key: 'otel.status_code',
            value: 'ERROR',
          }),
          expect.objectContaining({
            key: 'error',
            value: true,
          }),
          expect.objectContaining({
            key: 'otel.status_description',
            value: 'Syntax Error: Expected Name, found <EOF>.',
          }),
          expect.objectContaining({
            key: 'graphql.error.count',
            value: 1,
          }),
        ]),
      }),
    );
    expect(relevantTrace?.spans).not.toContainEqual(
      expect.objectContaining({ operationName: 'graphql.execute' }),
    );
    expect(
      relevantTrace?.spans.filter(r => r.operationName.includes('subgraph.execute')).length,
    ).toBe(0);
  });

  it('should report validate failures correctly', async () => {
    const serviceName = 'mesh-e2e-test-3';
    const { execute } = await serve({
      supergraph,
      env: {
        OTLP_EXPORTER_URL: `http://${JAEGER_HOSTNAME}:${jaeger.port}/v1/traces`,
        OTLP_SERVICE_NAME: serviceName,
      },
    });

    await expect(execute({ query: 'query { nonExistentField }' })).rejects.toMatchSnapshot();
    await setTimeout(300);
    const traces = await getJaegerTraces(serviceName, 2);
    expect(traces.data.length).toBe(2);
    const relevantTrace = traces.data.find(trace =>
      trace.spans.some(span => span.operationName === 'POST /graphql'),
    );
    expect(relevantTrace).toBeDefined();
    expect(relevantTrace?.spans.length).toBe(3);

    expect(relevantTrace?.spans).toContainEqual(
      expect.objectContaining({ operationName: 'POST /graphql' }),
    );
    expect(relevantTrace?.spans).toContainEqual(
      expect.objectContaining({ operationName: 'graphql.parse' }),
    );
    expect(relevantTrace?.spans).toContainEqual(
      expect.objectContaining({
        operationName: 'graphql.validate',
        tags: expect.arrayContaining([
          expect.objectContaining({
            key: 'otel.status_code',
            value: 'ERROR',
          }),
          expect.objectContaining({
            key: 'error',
            value: true,
          }),
          expect.objectContaining({
            key: 'otel.status_description',
            value: 'Cannot query field "nonExistentField" on type "Query".',
          }),
          expect.objectContaining({
            key: 'graphql.error.count',
            value: 1,
          }),
        ]),
      }),
    );
    expect(relevantTrace?.spans).not.toContainEqual(
      expect.objectContaining({ operationName: 'graphql.execute' }),
    );
    expect(
      relevantTrace?.spans.filter(r => r.operationName.includes('subgraph.execute')).length,
    ).toBe(0);
  });

  it('should report http failures', async () => {
    const serviceName = 'mesh-e2e-test-4';
    const { port } = await serve({
      supergraph,
      env: {
        OTLP_EXPORTER_URL: `http://${JAEGER_HOSTNAME}:${jaeger.port}/v1/traces`,
        OTLP_SERVICE_NAME: serviceName,
      },
    });

    await fetch(`http://localhost:${port}/non-existing`).catch(() => {});
    const traces = await getJaegerTraces(serviceName, 2);
    expect(traces.data.length).toBe(2);
    const relevantTrace = traces.data.find(trace =>
      trace.spans.some(span => span.operationName === 'GET /non-existing'),
    );
    expect(relevantTrace).toBeDefined();
    expect(relevantTrace?.spans.length).toBe(1);

    expect(relevantTrace?.spans).toContainEqual(
      expect.objectContaining({
        operationName: 'GET /non-existing',
        tags: expect.arrayContaining([
          expect.objectContaining({
            key: 'otel.status_code',
            value: 'ERROR',
          }),
          expect.objectContaining({
            key: 'error',
            value: true,
          }),
          expect.objectContaining({
            key: 'http.status_code',
            value: 404,
          }),
        ]),
      }),
    );
  });

  it('context propagation should work correctly', async () => {
    const traceId = '0af7651916cd43dd8448eb211c80319c';
    const serviceName = 'mesh-e2e-test-5';
    const { execute, port } = await serve({
      supergraph,
      env: {
        OTLP_EXPORTER_URL: `http://${JAEGER_HOSTNAME}:${jaeger.port}/v1/traces`,
        OTLP_SERVICE_NAME: serviceName,
      },
    });

    await expect(
      execute({
        query: TEST_QUERY,
        headers: {
          traceparent: `00-${traceId}-b7ad6b7169203331-01`,
        },
      }),
    ).resolves.toMatchSnapshot();

    const upstreamHttpCalls = await fetch(`http://localhost:${port}/upstream-fetch`).then(r =>
      r.json<
        Array<{
          url: string;
          headers?: Record<string, string>;
        }>
      >(),
    );

    const traces = await getJaegerTraces(serviceName, 3);
    expect(traces.data.length).toBe(3);

    const relevantTraces = traces.data.filter(trace =>
      trace.spans.some(span => span.operationName === 'POST /graphql'),
    );
    expect(relevantTraces.length).toBe(1);
    const relevantTrace = relevantTraces[0];
    expect(relevantTrace).toBeDefined();

    // Check for extraction of the otel context
    expect(relevantTrace.traceID).toBe(traceId);
    for (const span of relevantTrace.spans) {
      expect(span.traceID).toBe(traceId);
    }

    expect(upstreamHttpCalls.length).toBe(7);

    for (const call of upstreamHttpCalls) {
      const transparentHeader = (call.headers || {})['traceparent'];
      expect(transparentHeader).toBeDefined();
      expect(transparentHeader.length).toBeGreaterThan(1);
      expect(transparentHeader).toContain(traceId);
    }
  });
});
