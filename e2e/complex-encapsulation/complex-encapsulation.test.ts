import { createTenv } from '@e2e/tenv';

const { compose, service, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [await service('subgraph-a')],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
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
    name: 'Query empty string',
    query: /* GraphQL */ `
      query EmptyString($argument: String) {
        SubgraphA {
          emptyString(argument: $argument)
        }
      }
    `,
    variables: {
      argument: '',
    },
    expectedResult: {
      data: {
        SubgraphA: {
          emptyString: '',
        },
      },
    },
  },
  {
    name: 'Query undefined string',
    query: /* GraphQL */ `
      query UndefinedString($argument: String) {
        SubgraphA {
          undefinedString(argument: $argument)
        }
      }
    `,
    expectedResult: {
      data: {
        SubgraphA: {
          undefinedString: null,
        },
      },
    },
  },
  {
    name: 'Query undefined int',
    query: /* GraphQL */ `
      query UndefinedInt($argument: Int) {
        SubgraphA {
          undefinedInt(argument: $argument)
        }
      }
    `,
    expectedResult: {
      data: {
        SubgraphA: {
          undefinedInt: null,
        },
      },
    },
  },
  {
    name: 'Query zero int',
    query: /* GraphQL */ `
      query ZeroInt($argument: Int) {
        SubgraphA {
          zeroInt(argument: $argument)
        }
      }
    `,
    variables: {
      argument: 0,
    },
    expectedResult: {
      data: {
        SubgraphA: {
          zeroInt: 0,
        },
      },
    },
  },
  {
    name: 'Query false boolean',
    query: /* GraphQL */ `
      query FalseBoolean($argument: Boolean) {
        SubgraphA {
          falseBoolean(argument: $argument)
        }
      }
    `,
    variables: {
      argument: false,
    },
    expectedResult: {
      data: {
        SubgraphA: {
          falseBoolean: false,
        },
      },
    },
  },
  {
    name: 'Query undefined boolean',
    query: /* GraphQL */ `
      query UndefinedBoolean($argument: Boolean) {
        SubgraphA {
          undefinedBoolean(argument: $argument)
        }
      }
    `,
    expectedResult: {
      data: {
        SubgraphA: {
          undefinedBoolean: null,
        },
      },
    },
  },
])('should execute $name', async ({ query, variables, expectedResult }) => {
  const { output } = await compose({
    output: 'graphql',
    services: [await service('subgraph-a')],
  });
  const { execute } = await serve({ supergraph: output });
  await expect(execute({ query, variables })).resolves.toStrictEqual(expectedResult);
});
