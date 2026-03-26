import { createTenv, type Container } from '@e2e/tenv';

const { compose, service, serve, container } = createTenv(__dirname);

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
  },
  {
    name: 'Query empty string',
    query: /* GraphQL */ `
      query EmptyString($argument: String!) {
        SubgraphA {
          emptyString(argument: $argument)
        }
      }
    `,
    variables: {
      argument: '',
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
  },
  {
    name: 'Query zero int',
    query: /* GraphQL */ `
      query ZeroInt($argument: Int!) {
        SubgraphA {
          zeroInt(argument: $argument)
        }
      }
    `,
    variables: {
      argument: 0,
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
  },
])('should execute $name', async ({ query }) => {
  const { output } = await compose({
    output: 'graphql',
    services: [await service('subgraph-a')],
  });
  const { execute } = await serve({ supergraph: output });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
