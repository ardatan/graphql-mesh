import { buildSchema, GraphQLInputObjectType, GraphQLNonNull, type GraphQLArgument } from 'graphql';
import { bakeInputBodySelection } from '../src/connectAnnotations.js';

describe('bakeInputBodySelection', () => {
  const ResolveRootField = /* GraphQL */ `
    directive @resolveRootField(field: String) on INPUT_FIELD_DEFINITION
  `;

  it('expands ...$args.input with @resolveRootField remaps when requestBaseBody is present', () => {
    const schema = buildSchema(/* GraphQL */ `
      ${ResolveRootField}
      input CreateInput {
        product_name: String @resolveRootField(field: "product-name")
        quantity: Int
      }
      type Query {
        _: Boolean
      }
    `);
    const inputType = schema.getType('CreateInput') as GraphQLInputObjectType;
    // GraphQL 17's GraphQLArgument is a class; tests only need name/type for baking.
    const args = [
      {
        name: 'input',
        type: new GraphQLNonNull(inputType),
        description: null,
        defaultValue: undefined,
        deprecationReason: null,
        extensions: {},
        astNode: undefined,
      },
    ] as unknown as GraphQLArgument[];
    const body = `{
  api_key: $("secret")
  ...$args.input
}`;
    const baked = bakeInputBodySelection(body, args);
    expect(baked).toContain('api_key: $("secret")');
    expect(baked).toContain('"product-name": $args.input.product_name');
    expect(baked).toContain('quantity: $args.input.quantity');
    expect(baked).not.toContain('...$args.input');
  });

  it('leaves ...$args.input when there are no remaps', () => {
    const schema = buildSchema(/* GraphQL */ `
      input CreateInput {
        name: String
      }
      type Query {
        _: Boolean
      }
    `);
    const inputType = schema.getType('CreateInput') as GraphQLInputObjectType;
    const args = [
      {
        name: 'input',
        type: inputType,
        description: null,
        defaultValue: undefined,
        deprecationReason: null,
        extensions: {},
        astNode: undefined,
      },
    ] as unknown as GraphQLArgument[];
    const body = `{
  api_key: $("secret")
  ...$args.input
}`;
    expect(bakeInputBodySelection(body, args)).toBe(body);
  });

  it('still wraps bare $args.input with remapped subselection', () => {
    const schema = buildSchema(/* GraphQL */ `
      ${ResolveRootField}
      input CreateInput {
        product_name: String @resolveRootField(field: "product-name")
      }
      type Query {
        _: Boolean
      }
    `);
    const inputType = schema.getType('CreateInput') as GraphQLInputObjectType;
    const args = [
      {
        name: 'input',
        type: inputType,
        description: null,
        defaultValue: undefined,
        deprecationReason: null,
        extensions: {},
        astNode: undefined,
      },
    ] as unknown as GraphQLArgument[];
    expect(bakeInputBodySelection('$args.input', args)).toBe(
      '$args.input { "product-name": product_name }',
    );
  });
});
