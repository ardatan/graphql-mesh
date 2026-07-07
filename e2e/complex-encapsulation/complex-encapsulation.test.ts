import { createTenv, type Serve } from '@e2e/tenv';

const { compose, service, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [await service('subgraph-a'), await service('subgraph-b')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

describe('should execute queries', () => {
  let gateway: Serve;

  beforeAll(async () => {
    const { output } = await compose({
      output: 'graphql',
      services: [await service('subgraph-a'), await service('subgraph-b')],
    });
    gateway = await serve({ supergraph: output });
  });

  it.each([
    {
      name: 'Query foo',
      query: /* GraphQL */ `
        query {
          SubgraphA {
            foo(id: "123") {
              id
            }
          }
        }
      `,
      expectedResult: {
        data: {
          SubgraphA: {
            foo: {
              id: '123',
            },
          },
        },
      },
    },
    {
      name: 'Query echo empty string',
      query: /* GraphQL */ `
        query EchoString($argument: String) {
          SubgraphA {
            echoString(argument: $argument)
          }
        }
      `,
      variables: {
        argument: '',
      },
      expectedResult: {
        data: {
          SubgraphA: {
            echoString: '',
          },
        },
      },
    },
    {
      name: 'Query echo omitted string',
      query: /* GraphQL */ `
        query EchoString($argument: String) {
          SubgraphA {
            echoString(argument: $argument)
          }
        }
      `,
      expectedResult: {
        data: {
          SubgraphA: {
            echoString: null,
          },
        },
      },
    },
    {
      name: 'Query echo zero int',
      query: /* GraphQL */ `
        query EchoInt($argument: Int) {
          SubgraphA {
            echoInt(argument: $argument)
          }
        }
      `,
      variables: {
        argument: 0,
      },
      expectedResult: {
        data: {
          SubgraphA: {
            echoInt: 0,
          },
        },
      },
    },
    {
      name: 'Query echo omitted int',
      query: /* GraphQL */ `
        query EchoInt($argument: Int) {
          SubgraphA {
            echoInt(argument: $argument)
          }
        }
      `,
      expectedResult: {
        data: {
          SubgraphA: {
            echoInt: null,
          },
        },
      },
    },
    {
      name: 'Query echo false boolean',
      query: /* GraphQL */ `
        query EchoBoolean($argument: Boolean) {
          SubgraphA {
            echoBoolean(argument: $argument)
          }
        }
      `,
      variables: {
        argument: false,
      },
      expectedResult: {
        data: {
          SubgraphA: {
            echoBoolean: false,
          },
        },
      },
    },
    {
      name: 'Query echo omitted boolean',
      query: /* GraphQL */ `
        query EchoBoolean($argument: Boolean) {
          SubgraphA {
            echoBoolean(argument: $argument)
          }
        }
      `,
      expectedResult: {
        data: {
          SubgraphA: {
            echoBoolean: null,
          },
        },
      },
    },
    {
      name: 'pass header from args',
      query: /* GraphQL */ `
        query ($xCustomHeader: String!) {
          SubgraphB {
            headers(xCustomHeader: $xCustomHeader) {
              x_custom_header
            }
          }
        }
      `,
      variables: {
        xCustomHeader: 'test-value',
      },
      expectedResult: {
        data: {
          SubgraphB: {
            headers: {
              x_custom_header: 'test-value',
            },
          },
        },
      },
    },
    {
      name: 'empty string header',
      query: /* GraphQL */ `
        query ($xCustomHeader: String!) {
          SubgraphB {
            headers(xCustomHeader: $xCustomHeader) {
              x_custom_header
            }
          }
        }
      `,
      variables: {
        xCustomHeader: '',
      },
      expectedResult: {
        data: {
          SubgraphB: {
            headers: {
              x_custom_header: '',
            },
          },
        },
      },
    },
  ])('$name', async ({ query, variables, expectedResult }) => {
    await expect(gateway.execute({ query, variables })).resolves.toStrictEqual(expectedResult);
  });
});

it('Subgraph mode entity queries with encapsulation', async () => {
  const { output } = await compose({
    output: 'graphql',
    subgraph: 'subgraph-a',
    services: [await service('subgraph-a'), await service('subgraph-b')],
  });
  const subgraphServer = await serve({
    subgraph: output,
  });
  const response = await subgraphServer.execute({
    query: /* GraphQL */ `
      query {
        _entities(representations: [{ __typename: "SubgraphAFoo", id: "123" }]) {
          ... on SubgraphAFoo {
            id
            name
          }
        }
      }
    `,
  });
  expect(response).toEqual({
    data: {
      _entities: [
        {
          id: '123',
          name: 'Foo 123',
        },
      ],
    },
  });
});
