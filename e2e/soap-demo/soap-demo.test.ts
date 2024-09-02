import { createTenv, type Container } from '@e2e/tenv';

const { compose, serve, container } = createTenv(__dirname);

let soapDemo: Container;

beforeAll(async () => {
  soapDemo = await container({
    name: 'soap-demo',
    image: 'outofcoffee/imposter',
    containerPort: 8080,
    volumes: [
      {
        host: __dirname,
        container: '/opt/imposter/config',
      },
    ],
    healthcheck: [],
  });
});

it('should compose the appropriate schema', async () => {
  const { result } = await compose({
    services: [soapDemo],
    maskServicePorts: true,
  });
  expect(result).toMatchSnapshot();
});

it.concurrent.each([
  {
    name: 'AddInteger',
    query: /* GraphQL */ `
      mutation AddInteger {
        s0_SOAPDemo_SOAPDemoSoap_AddInteger(AddInteger: { Arg1: 2, Arg2: 3 }) {
          AddIntegerResult
        }
      }
    `,
    expected: {
      data: {
        s0_SOAPDemo_SOAPDemoSoap_AddInteger: {
          AddIntegerResult: expect.any(Number),
        },
      },
    },
  },
  {
    name: 'DivideInteger',
    query: /* GraphQL */ `
      mutation DivideInteger {
        s0_SOAPDemo_SOAPDemoSoap_DivideInteger(DivideInteger: { Arg1: 10, Arg2: 2 }) {
          DivideIntegerResult
        }
      }
    `,
    expected: {
      data: {
        s0_SOAPDemo_SOAPDemoSoap_DivideInteger: {
          DivideIntegerResult: expect.any(Number),
        },
      },
    },
  },
  {
    name: 'FindPerson',
    query: /* GraphQL */ `
      query FindPerson {
        s0_SOAPDemo_SOAPDemoSoap_FindPerson(FindPerson: { id: "1" }) {
          FindPersonResult {
            Age
            DOB
            FavoriteColors {
              FavoriteColorsItem
            }
            Home {
              City
              State
              Street
              Zip
            }
            Name
            SSN
            Office {
              City
              State
              Street
              Zip
            }
          }
        }
      }
    `,
    expected: {
      data: {
        s0_SOAPDemo_SOAPDemoSoap_FindPerson: {
          FindPersonResult: {
            Age: expect.any(Number),
            DOB: expect.any(String),
            FavoriteColors: {
              FavoriteColorsItem: expect.arrayContaining([expect.any(String)]),
            },
            Home: {
              City: expect.any(String),
              State: expect.any(String),
              Street: expect.any(String),
              Zip: expect.any(String),
            },
            Name: expect.any(String),
            SSN: expect.any(String),
            Office: {
              City: expect.any(String),
              State: expect.any(String),
              Street: expect.any(String),
              Zip: expect.any(String),
            },
          },
        },
      },
    },
  },
  {
    name: 'GetListByName',
    query: /* GraphQL */ `
      query GetListByName {
        s0_SOAPDemo_SOAPDemoSoap_GetListByName(GetListByName: { name: "Newton" }) {
          GetListByNameResult {
            PersonIdentification {
              Name
              DOB
              ID
              SSN
            }
          }
        }
      }
    `,
    expected: {
      data: {
        s0_SOAPDemo_SOAPDemoSoap_GetListByName: {
          GetListByNameResult: {
            PersonIdentification: expect.arrayContaining([
              {
                Name: expect.any(String),
                DOB: expect.any(String),
                ID: expect.any(String),
                SSN: expect.any(String),
              },
            ]),
          },
        },
      },
    },
  },
])('should execute $name', async ({ query, expected }) => {
  const { output } = await compose({ output: 'graphql', services: [soapDemo] });
  const { execute } = await serve({ supergraph: output });
  await expect(execute({ query })).resolves.toEqual(expected);
});
