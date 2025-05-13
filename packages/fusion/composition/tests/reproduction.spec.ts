import { buildSchema } from 'graphql';
import { composeSubgraphs } from '@graphql-mesh/fusion-composition';

describe('Reproductions', () => {
  it('GW-164', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @myDirective(myarg: [MyEnum!]!) on OBJECT
      enum MyEnum {
        MY_ENUM_VALUE
      }
      type Query {
        myRootField: MyObject
      }

      type MyObject @myDirective(myarg: []) {
        myField: String
      }
    `);
    const result = composeSubgraphs([
      {
        name: 'A',
        schema,
      },
    ]);
    expect(result).toMatchSnapshot();
  });
});
