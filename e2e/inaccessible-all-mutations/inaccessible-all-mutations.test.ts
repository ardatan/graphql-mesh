import { createTenv, type Service } from '@e2e/tenv';

describe('Inaccessible All Mutations', () => {
  // Check only service-b mutations  are filtered and service-a mutations are accessible

  const { compose, serve, service, fs } = createTenv(__dirname);

  let serviceA: Service;
  let serviceB: Service;

  beforeAll(async () => {
    serviceA = await service('service-a');
    serviceB = await service('service-b');
  });

  it('should compose the appropriate schema', async () => {
    const { result } = await compose({
      services: [serviceA, serviceB],
      maskServicePorts: true,
    });
    expect(result).toMatchSnapshot();
  });

  it('should execute the accessible mutations', async () => {
    const { output } = await compose({ output: 'graphql', services: [serviceA, serviceB] });

    const { execute } = await serve({ supergraph: output });
    await expect(
      execute({
        query: /* GraphQL */ `
          mutation {
            createTodo(title: "Test") {
              id
              title
            }
          }
        `,
      }),
    ).resolves.toEqual({
      data: {
        createTodo: {
          id: '3',
          title: 'Test',
        },
      },
    });
  });

  it('should not execute the inaccessible mutations', async () => {
    const { output } = await compose({ output: 'graphql', services: [serviceA, serviceB] });

    const { execute } = await serve({ supergraph: output });
    await expect(
      execute({
        query: /* GraphQL */ `
          mutation {
            addUser(name: "Test") {
              id
              name
            }
          }
        `,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
"400 Bad Request
{"errors":[{"message":"Cannot query field \\"addUser\\" on type \\"Mutation\\".","locations":[{"line":3,"column":13}],"extensions":{"code":"GRAPHQL_VALIDATION_FAILED"}}]}"
`);
  });
});
