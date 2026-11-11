import { createTenv, type Service } from '@e2e/tenv';

describe('OpenAPI rest transport Union Error Handling', () => {
  const { compose, serve, service } = createTenv(__dirname);

  let errorService: Service;

  beforeAll(async () => {
    errorService = await service('ErrorService');
  });

  it('should compose', async () => {
    const { result } = await compose({
      output: 'graphql',
      services: [errorService],
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot();
  });

  it('should provide consistent error handling for direct and union response types', async () => {
    const { output } = await compose({
      output: 'graphql',
      services: [errorService],
    });

    const { execute } = await serve({
      supergraph: output,
    });

    // Test endpoints WITHOUT error handling in OpenAPI schema - should get GraphQL errors
    // This is the case when using ignoreErrorResponses: true
    // Apollo `extensions.http.status` is also GraphQL Yoga's response-status hook, so the
    // HTTP status may be 400 (graphql-response+json) while the body still carries errors.
    let noErrorHandlingResult: Awaited<ReturnType<typeof execute>>;
    try {
      noErrorHandlingResult = await execute({
        query: /* GraphQL */ `
          query TestNoErrorHandling {
            getUserNoErrorHandling {
              id
              name
              email
            }
            getUserUnionNoErrorHandling {
              ... on User {
                id
                name
                email
              }
              ... on AsyncJob {
                asynchronous_job_id
                status
                estimated_completion
              }
            }
          }
        `,
      });
    } catch (err: any) {
      if (err?.name !== 'ResponseError') {
        throw err;
      }
      const body = String(err.message).split('\n').slice(1).join('\n');
      noErrorHandlingResult = JSON.parse(body);
    }

    // Should get GraphQL errors since these endpoints don't have 400 in their OpenAPI spec
    expect(noErrorHandlingResult.errors).toHaveLength(2);
    expect(noErrorHandlingResult.errors?.[0].message).toMatch(
      /^Upstream HTTP Error: 400, Could not invoke operation GET /,
    );
    expect(noErrorHandlingResult.errors?.[1].message).toMatch(
      /^Upstream HTTP Error: 400, Could not invoke operation GET /,
    );

    // Check that error extensions are properly populated (Mesh Downstream + Apollo http/connector)
    const firstError = noErrorHandlingResult.errors?.[0];
    const secondError = noErrorHandlingResult.errors?.[1];

    expect(firstError?.extensions).toMatchObject({
      code: 'DOWNSTREAM_SERVICE_ERROR',
      service: 'ErrorAPI',
      serviceName: 'ErrorAPI',
      request: {
        method: 'GET',
      },
      response: {
        status: 400,
      },
    });
    // Yoga may promote `extensions.http` into the GraphQL HTTP status; keep either shape.
    expect(firstError?.extensions?.http?.status ?? firstError?.extensions?.status).toBe(400);

    expect(secondError?.extensions).toMatchObject({
      code: 'DOWNSTREAM_SERVICE_ERROR',
      service: 'ErrorAPI',
      serviceName: 'ErrorAPI',
      request: {
        method: 'GET',
      },
      response: {
        status: 400,
      },
    });
    expect(secondError?.extensions?.http?.status ?? secondError?.extensions?.status).toBe(400);
  });

  it('should be able to cast error responses to Error type when error handling is in OpenAPI schema', async () => {
    const { output } = await compose({
      output: 'graphql',
      services: [errorService],
    });

    const { execute } = await serve({
      supergraph: output,
    });

    // Test endpoints WITH error handling in OpenAPI schema - should get data with error casting
    const errorHandlingResult = await execute({
      query: /* GraphQL */ `
        query TestErrorHandling {
          getUserErrorHandling {
            ... on User {
              id
              name
              email
            }
            ... on Error {
              error
              code
            }
          }
          getUserUnionErrorHandling {
            ... on User {
              id
              name
              email
            }
            ... on AsyncJob {
              asynchronous_job_id
              status
              estimated_completion
            }
            ... on Error {
              error
              code
            }
          }
        }
      `,
    });

    expect(errorHandlingResult.errors).toBeFalsy();

    // Both direct and union fields should return error data when casting to Error type
    expect(errorHandlingResult.data?.getUserErrorHandling).toEqual({
      error: 'User not found',
      code: 400,
    });

    expect(errorHandlingResult.data?.getUserUnionErrorHandling).toEqual({
      error: 'User union error',
      code: 400,
    });

    // Verify that when error handling is in the OpenAPI schema,
    // the response is returned as data (not GraphQL errors) and contains the expected status code
    expect(errorHandlingResult.data?.getUserErrorHandling?.code).toBe(400);
    expect(errorHandlingResult.data?.getUserUnionErrorHandling?.code).toBe(400);
  });
});
