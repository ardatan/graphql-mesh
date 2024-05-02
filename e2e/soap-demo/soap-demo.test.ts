import { createTenv } from '@e2e/tenv';

const { compose, serve } = createTenv(__dirname);

it('should compose the appropriate schema', async () => {
  const { result } = await compose();
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
  },
])('should execute $name', async ({ query }) => {
  const { output } = await compose({ output: 'graphql' });
  const { execute } = await serve({ fusiongraph: output });
  await expect(execute({ query })).resolves.toMatchSnapshot();
});
