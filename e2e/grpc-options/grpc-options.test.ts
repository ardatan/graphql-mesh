import { createTenv, type Service } from '@e2e/tenv';

const REFLECTION_TOKEN = 'reflect-secret';

describe('gRPC options (deadline, channelOptions, reflectionMetadata)', () => {
  const { compose, service, serve } = createTenv(__dirname);
  let echo: Service;

  beforeAll(async () => {
    // Token is hardcoded as default in the Echo service; env is not forwarded by tenv.service()
    echo = await service('Echo');
  });

  it('loads the schema via reflection when reflectionMetadata is provided', async () => {
    const { result } = await compose({
      services: [echo],
      output: 'graphql',
      env: {
        GRPC_REFLECTION_TOKEN: REFLECTION_TOKEN,
      },
    });
    expect(result).toContain('echo_Echo_GetGreeting');
    expect(result).toContain('echo_Echo_GetSlowGreeting');
    expect(result).toContain('echo_Echo_GetLargePayload');
  });

  it('fails reflection without the required reflectionMetadata', async () => {
    await expect(
      compose({
        services: [echo],
        output: 'graphql',
        env: {
          // Falsy → mesh.config omits reflectionMetadata
          GRPC_REFLECTION_TOKEN: '',
        },
      }),
    ).rejects.toThrow(/x-reflection-token|UNAUTHENTICATED|reflection|UNAVAILABLE/i);
  });

  it('enforces requestTimeout as a per-call deadline', async () => {
    const { output } = await compose({
      services: [echo],
      output: 'graphql',
      env: {
        GRPC_REFLECTION_TOKEN: REFLECTION_TOKEN,
        // Slow RPC sleeps 3s — deadline must fire first
        GRPC_REQUEST_TIMEOUT: '500',
      },
    });
    const { execute } = await serve({ supergraph: output });
    const result = await execute({
      query: /* GraphQL */ `
        query {
          echo_Echo_GetSlowGreeting(input: { name: "Mesh" }) {
            message
          }
        }
      `,
    });
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'DOWNSTREAM_SERVICE_ERROR',
      grpc: {
        statusName: 'DEADLINE_EXCEEDED',
      },
    });
  }, 15_000);

  it('accepts large responses when channelOptions raise max receive size', async () => {
    const { output } = await compose({
      services: [echo],
      output: 'graphql',
      env: {
        GRPC_REFLECTION_TOKEN: REFLECTION_TOKEN,
        GRPC_MAX_RECEIVE_MESSAGE_LENGTH: String(8 * 1024 * 1024),
      },
    });
    const { execute } = await serve({ supergraph: output });
    const result = await execute({
      query: /* GraphQL */ `
        query {
          echo_Echo_GetLargePayload(input: { name: "Mesh" }) {
            data
          }
        }
      `,
    });
    expect(result.errors).toBeFalsy();
    expect(result.data?.echo_Echo_GetLargePayload?.data).toBeTruthy();
  });

  it('rejects large responses with the default max receive size', async () => {
    const { output } = await compose({
      services: [echo],
      output: 'graphql',
      env: {
        GRPC_REFLECTION_TOKEN: REFLECTION_TOKEN,
        // Explicit 4 MiB limit (payload is 5 MiB)
        GRPC_MAX_RECEIVE_MESSAGE_LENGTH: String(4 * 1024 * 1024),
      },
    });
    const { execute } = await serve({ supergraph: output });
    const result = await execute({
      query: /* GraphQL */ `
        query {
          echo_Echo_GetLargePayload(input: { name: "Mesh" }) {
            data
          }
        }
      `,
    });
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: 'DOWNSTREAM_SERVICE_ERROR',
      grpc: {
        statusName: 'RESOURCE_EXHAUSTED',
      },
    });
  });
});
