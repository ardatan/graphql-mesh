import { makeExecutableSchema } from '@graphql-tools/schema';
import { isGraphQLJitCompatible } from '../src/utils';

describe('isGraphQLJitCompatible', () => {
  it('should return false if the schema has recursive input types', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Query {
          hello(field: RecursiveInput): String
        }
        input RecursiveInput {
          regularInput: String
          recursiveInput: RecursiveInput
        }
      `,
      resolvers: {},
    });
    expect(isGraphQLJitCompatible(schema)).toBeFalsy();
  });
  it('should return false if the schema has recursive input types nestedly', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Query {
          hello(field: RecursiveInput): String
        }
        input RecursiveInput {
          regularInput: String
          anotherInput: AnotherInput
        }
        input AnotherInput {
          recursiveInput: RecursiveInput
        }
      `,
      resolvers: {},
    });
    expect(isGraphQLJitCompatible(schema)).toBeFalsy();
  });
  it('should return true if the schema does not have recursive input types', () => {
    const schema = makeExecutableSchema({
      typeDefs: `
        type Query {
          hello(input: TestInput): String
          hello2(input: TestInput): String
        }
        input TestInput {
          field: String
        }
      `,
      resolvers: {},
    });
    expect(isGraphQLJitCompatible(schema)).toBeTruthy();
  });
});
