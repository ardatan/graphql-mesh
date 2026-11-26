import {
  buildSchema,
  GraphQLDirective,
  GraphQLString,
  Kind,
  parse,
  type FieldNode,
  type OperationDefinitionNode,
} from 'graphql';
import type { StitchingInfo } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { parseSelectionSet } from '@graphql-tools/utils';
import { entryPointAppliesToParent } from '../src/entryPointAppliesToParent.js';
import { mergeDirectives } from '../src/mergeDirectives.js';
import { resolveLocalFieldResult } from '../src/resolveLocalFieldResult.js';
import { forwardArgsToSelectionSet } from '../src/selectionSetArgs.js';
import { stitchSchemas } from '../src/stitchSchemas.js';
import { ValidationLevel } from '../src/types.js';

describe('CodeRabbit stitch regressions', () => {
  describe('selectionSetArgs own-property mapping', () => {
    it('does not treat inherited toString as an explicit mapping', () => {
      const gatewayField = parseSelectionSet('{ posts(pageNumber: 1) }').selections[0] as FieldNode;
      const mapping = Object.create({ toString: ['pageNumber'] }) as Record<string, string[]>;
      expect(Object.prototype.hasOwnProperty.call(mapping, 'toString')).toBe(false);
      const build = forwardArgsToSelectionSet('{ toString }', mapping);
      const result = build(gatewayField).selections[0] as FieldNode;
      expect(result.name.value).toBe('toString');
      expect(result.arguments ?? []).toHaveLength(0);
    });

    it('forwards arguments for explicit own mappings', () => {
      const gatewayField = parseSelectionSet('{ posts(pageNumber: 1) }').selections[0] as FieldNode;
      const build = forwardArgsToSelectionSet('{ postIds }', { postIds: ['pageNumber'] });
      const result = build(gatewayField).selections[0] as FieldNode;
      expect(result.arguments?.[0]?.name.value).toBe('pageNumber');
    });
  });

  describe('entryPointAppliesToParent type conditions', () => {
    it('ignores type-conditioned fragments that do not match __typename', () => {
      expect(
        entryPointAppliesToParent(
          { selectionSet: '{ ... on Book { isbn } ... on Magazine { issue } }' },
          { __typename: 'Book', isbn: '1' },
        ),
      ).toBe(true);
      expect(
        entryPointAppliesToParent(
          { selectionSet: '{ ... on Book { isbn } ... on Magazine { issue } }' },
          { __typename: 'Book' },
        ),
      ).toBe(false);
    });
  });

  describe('mergeValidations', () => {
    it('rejects differing list nesting depths', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Error },
          },
          subschemas: [
            { schema: buildSchema('type Query { field: [[String]] }') },
            { schema: buildSchema('type Query { field: [String] }') },
          ],
        });
      }).toThrow(/inconsistent list types/);
    });

    it('compares input enum names rather than internal values', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      try {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: { validationLevel: ValidationLevel.Warn },
          },
          subschemas: [
            {
              schema: buildSchema(`
                enum Status { ACTIVE }
                input Filter { status: Status }
                type Query { f(filter: Filter): String }
              `),
            },
            {
              schema: makeExecutableSchema({
                typeDefs: `
                  enum Status { ACTIVE }
                  input Filter { status: Status }
                  type Query { f(filter: Filter): String }
                `,
                resolvers: {
                  Status: { ACTIVE: 0 },
                },
              }),
            },
          ],
        });
        expect(warn.mock.calls.some(c => String(c[0]).includes('inconsistent values'))).toBe(false);
      } finally {
        warn.mockRestore();
      }
    });

    it('checks list item nullability in strict mode', () => {
      expect(() => {
        stitchSchemas({
          typeMergingOptions: {
            validationSettings: {
              validationLevel: ValidationLevel.Error,
              strictNullComparison: true,
            },
          },
          subschemas: [
            { schema: buildSchema('type Query { field: [String!] }') },
            { schema: buildSchema('type Query { field: [String] }') },
          ],
        });
      }).toThrow(/Nullability of field/);
    });
  });

  describe('mergeCandidates', () => {
    it('rejects mixed OneOf and ordinary input definitions', () => {
      expect(() => {
        stitchSchemas({
          subschemas: [
            {
              schema: buildSchema(`
                input Filter @oneOf { a: String b: Int }
                type Query { f(filter: Filter): String }
              `),
            },
            {
              schema: buildSchema(`
                input Filter { a: String b: Int }
                type Query { f(filter: Filter): String }
              `),
            },
          ],
        });
      }).toThrow(/mix OneOf and ordinary/);
    });

    it('preserves non-null when useNonNullableFieldOnConflict is enabled', () => {
      const schema = stitchSchemas({
        typeMergingOptions: {
          useNonNullableFieldOnConflict: true,
          validationSettings: { validationLevel: ValidationLevel.Off },
        },
        subschemas: [
          { schema: buildSchema('type Query { field: String }') },
          { schema: buildSchema('type Query { field: String! }') },
        ],
      });
      const field = schema.getQueryType()!.getFields().field!;
      expect(String(field.type)).toBe('String!');
    });
  });

  describe('mergeDirectives', () => {
    it('preserves an agreed deprecationReason across candidates', () => {
      const a = new GraphQLDirective({
        name: 'feature',
        locations: ['FIELD_DEFINITION' as any],
        deprecationReason: 'use other',
      });
      const b = new GraphQLDirective({
        name: 'feature',
        locations: ['FIELD_DEFINITION' as any],
        args: { flag: { type: GraphQLString } },
      });
      const merged = mergeDirectives(new Set([a, b]))!;
      expect(merged.deprecationReason).toBe('use other');
    });
  });

  describe('resolveLocalFieldResult', () => {
    function infoOf(source: string) {
      const document = parse(source);
      const operation = document.definitions[0] as OperationDefinitionNode;
      const fieldNode = operation.selectionSet.selections[0] as FieldNode;
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Variant {
            sku: String
            price: Int
          }
          type Product {
            id: ID!
            name: String
            label: String
            variants: [Variant]
          }
          type Query {
            product: Product
          }
        `,
      });
      return {
        schema,
        fieldName: 'product',
        fieldNodes: [fieldNode],
        returnType: schema.getType('Product')!,
        parentType: schema.getQueryType()!,
        fragments: {},
        variableValues: {},
      } as any;
    }

    it('does not concatenate a local list with its hydrated result', async () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Variant {
            sku: String
            price: Int
          }
          type Product {
            id: ID!
            variants: [Variant]
          }
          type Query {
            product: Product
          }
        `,
      });
      const productType = schema.getType('Product')!;
      const subschema = { merge: { Product: {} } } as any;
      const resolver = jest.fn(async () => ({
        variants: [{ sku: 'A', price: 10 }],
      }));
      const stitchingInfo = {
        mergedTypes: {
          Product: {
            selectionSets: new Map([[subschema, parseSelectionSet('{ id }')]]),
            resolvers: new Map([[subschema, resolver]]),
            entryPointSelectionSets: undefined,
            fieldSelectionSets: new Map(),
          },
        },
        fieldNodesByField: Object.create(null),
      } as unknown as StitchingInfo;

      const result = await resolveLocalFieldResult(
        { id: '1', variants: [{ sku: 'A' }] },
        {},
        {
          ...infoOf('{ product { variants { sku price } } }'),
          schema: { extensions: { stitchingInfo }, getType: schema.getType.bind(schema) },
          returnType: productType,
        },
        stitchingInfo,
      );

      expect(resolver).toHaveBeenCalled();
      expect(Array.isArray(result.variants)).toBe(true);
      expect(result.variants).toHaveLength(1);
      expect(result.variants[0]).toMatchObject({ sku: 'A', price: 10 });
    });

    it('preserves ExternalObject annotations from the delegated result', async () => {
      // Same symbols annotateExternalObject uses; nested type merging needs them.
      const EXT = Symbol.for('subschemaErrors');
      const OBJ = Symbol.for('initialSubschema');
      const resolver = jest.fn(async () => {
        const hydrated: Record<string | symbol, unknown> = {
          id: '1',
          name: 'Desk',
          review: { id: '1' },
        };
        Object.defineProperty(hydrated, EXT, { value: [], writable: true });
        Object.defineProperty(hydrated, OBJ, { value: { name: 'products' }, writable: true });
        return hydrated;
      });
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Review {
            id: ID!
            content: String
          }
          type Product {
            id: ID!
            name: String
            review: Review
          }
          type Query {
            product: Product
          }
        `,
      });
      const productType = schema.getType('Product')!;
      const subschema = { merge: { Product: {} } } as any;
      const stitchingInfo = {
        mergedTypes: {
          Product: {
            selectionSets: new Map([[subschema, parseSelectionSet('{ id }')]]),
            resolvers: new Map([[subschema, resolver]]),
            entryPointSelectionSets: undefined,
            fieldSelectionSets: new Map(),
          },
        },
        fieldNodesByField: Object.create(null),
      } as unknown as StitchingInfo;

      const result = await resolveLocalFieldResult(
        { id: '1', name: 'Desk' },
        {},
        {
          ...infoOf('{ product { name review { id content } } }'),
          schema: { extensions: { stitchingInfo }, getType: schema.getType.bind(schema) },
          returnType: productType,
        },
        stitchingInfo,
      );

      expect(resolver).toHaveBeenCalled();
      expect(result[EXT]).toEqual([]);
      expect(result[OBJ]).toEqual({ name: 'products' });
      expect(result.review).toEqual({ id: '1' });
    });

    it('does not mutate the resolver payload when adding __typename', async () => {
      const original: { id: string; __typename?: string } = { id: '1' };
      const resolver = jest.fn(async (parent: any) => {
        expect(parent).not.toBe(original);
        expect(parent.__typename).toBe('Product');
        expect(original.__typename).toBeUndefined();
        return { name: 'Hydrated' };
      });
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Product {
            id: ID!
            name: String
          }
          type Query {
            product: Product
          }
        `,
      });
      const productType = schema.getType('Product')!;
      const subschema = { merge: { Product: {} } } as any;
      const stitchingInfo = {
        mergedTypes: {
          Product: {
            selectionSets: new Map([[subschema, parseSelectionSet('{ id }')]]),
            resolvers: new Map([[subschema, resolver]]),
            entryPointSelectionSets: undefined,
            fieldSelectionSets: new Map(),
          },
        },
        fieldNodesByField: Object.create(null),
      } as unknown as StitchingInfo;

      await resolveLocalFieldResult(
        original,
        {},
        {
          ...infoOf('{ product { name } }'),
          schema: { extensions: { stitchingInfo }, getType: schema.getType.bind(schema) },
          returnType: productType,
        },
        stitchingInfo,
      );
      expect(original).toEqual({ id: '1' });
      expect(resolver).toHaveBeenCalled();
    });
  });

  describe('relay concrete __resolveType', () => {
    it('does not return the Node interface from fragment conditions', async () => {
      const { handleRelaySubschemas } = await import('../src/relay.js');
      const userSchema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          interface Node {
            id: ID!
          }
          type User implements Node {
            id: ID!
            name: String
          }
          type Query {
            node(id: ID!): Node
            user(id: ID!): User
          }
        `,
        resolvers: {
          Query: {
            user: () => ({ id: '1', name: 'Ada' }),
            node: () => ({ id: '1' }),
          },
          Node: { __resolveType: () => 'User' },
        },
      });
      const subschemas = handleRelaySubschemas([{ schema: userSchema }]);
      const relay = subschemas[subschemas.length - 1]!;
      const resolveType = (relay.schema.getType('Node') as any).resolveType;
      const type = resolveType(
        { id: '1' },
        {},
        {
          fieldNodes: [
            {
              selectionSet: {
                selections: [
                  {
                    kind: Kind.INLINE_FRAGMENT,
                    typeCondition: { name: { value: 'Node' } },
                    selectionSet: { selections: [] },
                  },
                  {
                    kind: Kind.INLINE_FRAGMENT,
                    typeCondition: { name: { value: 'User' } },
                    selectionSet: { selections: [] },
                  },
                ],
              },
            },
          ],
          fragments: {},
        },
      );
      expect(type).toBe('User');
      expect(type).not.toBe('Node');
    });
  });
});
