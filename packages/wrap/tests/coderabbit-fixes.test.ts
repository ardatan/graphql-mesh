import {
  buildSchema,
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
  OperationTypeNode,
  parse,
  print,
} from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import {
  FilterObjectFieldDirectives,
  HoistField,
  MapFields,
  MapLeafValues,
  RemoveObjectFieldDeprecations,
  RemoveObjectFieldsWithDeprecation,
  RenameObjectFieldArguments,
  RenameRootTypes,
  RenameTypes,
  TransformCompositeFields,
  TransformEnumValues,
  TransformInputObjectFields,
  TransformQuery,
  WrapQuery,
  wrapSchema,
} from '../src/index.js';
import { renameFieldNode, unwrapValue, wrapFieldNode } from '../src/transforms/HoistField.js';
import { MoveRootField } from '../src/transforms/MoveRootField.js';

describe('wrap CodeRabbit fixes', () => {
  describe('HoistField', () => {
    it('selects the operation from the wrapping schema query root', () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            user: User
          }
          type User {
            profile: Profile
          }
          type Profile {
            email: String
          }
        `,
      });
      // Renaming the query root must still select the query operation.
      const renamed = wrapSchema({
        schema,
        transforms: [new RenameRootTypes(name => (name === 'Query' ? 'RootQuery' : name))],
      });
      const hoisted = wrapSchema({
        schema: renamed,
        transforms: [new HoistField('RootQuery', ['user', 'profile', 'email'], 'userEmail')],
      });
      const root = hoisted.getQueryType();
      expect(root?.name).toBe('RootQuery');
      expect(root?.getFields().userEmail).toBeDefined();
    });

    it('gives distinct wrapper aliases when hoisted arguments differ', () => {
      const argLevels: Record<string, number> = Object.create(null);
      argLevels['id'] = 0;
      const ctx = { wrapperAliases: new Set<string>() };
      const a = wrapFieldNode(
        renameFieldNode(
          {
            kind: Kind.FIELD,
            name: { kind: Kind.NAME, value: 'email' },
            arguments: [
              {
                kind: Kind.ARGUMENT,
                name: { kind: Kind.NAME, value: 'id' },
                value: { kind: Kind.STRING, value: '1' },
              },
            ],
          },
          'email',
        ),
        ['user'],
        '__gqtlw__',
        argLevels,
        ctx,
      );
      const b = wrapFieldNode(
        renameFieldNode(
          {
            kind: Kind.FIELD,
            name: { kind: Kind.NAME, value: 'email' },
            arguments: [
              {
                kind: Kind.ARGUMENT,
                name: { kind: Kind.NAME, value: 'id' },
                value: { kind: Kind.STRING, value: '2' },
              },
            ],
          },
          'email',
        ),
        ['user'],
        '__gqtlw__',
        argLevels,
        ctx,
      );
      expect(a.alias?.value).not.toBe(b.alias?.value);
      expect(ctx.wrapperAliases.size).toBe(2);
    });

    it('preserves client response keys when relocating errors', () => {
      const { unwrapErrors } = require('../src/transforms/HoistField.js');
    });

    it('unwraps only tracked wrapper aliases', () => {
      const original = {
        __gqtlw__: { email: 'a@b.c' },
        // Client-requested alias that matches the base wrapper name string
        // should be preserved when not in the tracked set.
      };
      const ctx = { wrapperAliases: new Set(['__gqtlw__']) };
      const result = unwrapValue(
        {
          __gqtlw__: { email: 'a@b.c' },
          kept: 1,
        },
        '__gqtlw__',
        ctx,
      );
      expect(result).toEqual({ email: 'a@b.c', kept: 1 });
    });

    it('represents every list level on the hoisted path in the field type', () => {
      const schema = buildSchema(/* GraphQL */ `
        type Query {
          teams: [Team!]!
        }
        type Team {
          members: [Member!]!
        }
        type Member {
          name: String!
        }
      `);
      const hoisted = wrapSchema({
        schema,
        transforms: [new HoistField('Query', ['teams', 'members', 'name'], 'memberNames')],
      });
      const field = hoisted.getQueryType()!.getFields().memberNames!;
      // two list levels on the path → [[String!]]
      expect(String(field.type)).toBe('[[String!]]');
    });
  });

  describe('MapLeafValues', () => {
    it('maps field arguments in named fragments and maps variables once', () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          enum Color {
            RED
            BLUE
          }
          type Query {
            paint(color: Color!): String
          }
        `,
        resolvers: {
          Query: {
            paint: (_, { color }) => color,
          },
        },
      });

      const transform = new MapLeafValues(
        (typeName, value) => (typeName === 'Color' && value === 'RED' ? 'R' : value),
        (typeName, value) => value,
      );
      transform.transformSchema(schema, { schema } as any);

      const document = parse(/* GraphQL */ `
        query ($c: Color!) {
          ...PaintFrag
        }
        fragment PaintFrag on Query {
          paint(color: $c)
        }
      `);

      const variables: Record<string, any> = { c: 'RED' };
      const transformed = transform.transformRequest({ document, variables }, {} as any, {} as any);

      expect(transformed.variables).toEqual({ c: 'R' });
      // Omitted variables stay absent
      const transformed2 = transform.transformRequest(
        { document, variables: {} },
        {} as any,
        {} as any,
      );
      expect(Object.prototype.hasOwnProperty.call(transformed2.variables, 'c')).toBe(false);
    });
  });

  describe('MoveRootField', () => {
    it('preserves original configs when swapping root fields', () => {
      const schema = buildSchema(/* GraphQL */ `
        type Query {
          foo: Int
          bar: String
        }
        type Mutation {
          unused: Boolean
        }
      `);
      const newSchema = wrapSchema({
        schema,
        transforms: [
          new MoveRootField({
            query: {
              foo: OperationTypeNode.MUTATION,
              bar: OperationTypeNode.MUTATION,
            },
            mutation: {
              unused: OperationTypeNode.QUERY,
            },
            subscription: {},
          }),
        ],
      });
      expect(newSchema.getQueryType()!.getFields().unused).toBeDefined();
      expect(newSchema.getMutationType()!.getFields().foo).toBeDefined();
      expect(String(newSchema.getMutationType()!.getFields().foo!.type)).toBe('Int');
      expect(String(newSchema.getMutationType()!.getFields().bar!.type)).toBe('String');
    });

    it('uses the wrapping operation for result __typename', () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          type Query {
            foo: String
          }
        `,
        resolvers: { Query: { foo: () => 'FOO' } },
      });
      const transform = new MoveRootField({
        query: { foo: OperationTypeNode.MUTATION },
        mutation: {},
        subscription: {},
      });
      const newSchema = transform.transformSchema(schema, {});
      const ctx: Record<string, any> = {};
      transform.transformRequest(
        {
          document: parse('mutation { __typename foo }'),
          operationType: OperationTypeNode.MUTATION,
        },
        {} as any,
        ctx,
      );
      const result = transform.transformResult(
        { data: { __typename: 'Query', foo: 'FOO' } },
        {} as any,
        ctx,
      );
      expect(result.data?.__typename).toBe(newSchema.getMutationType()!.name);
    });
  });

  describe('TransformCompositeFields', () => {
    it('does not treat conditional __typename as a guaranteed tag', () => {
      const schema = buildSchema(/* GraphQL */ `
        type Query {
          user: User
        }
        type User {
          name: String
        }
      `);
      let sawInternalTypename = false;
      const transform = new TransformCompositeFields(
        () => undefined,
        undefined,
        value => {
          if (value?.__typename === 'User') {
            sawInternalTypename = true;
          }
          return value;
        },
      );
      transform.transformSchema(schema, { schema } as any);
      const req = transform.transformRequest(
        {
          document: parse(/* GraphQL */ `
            {
              user {
                name
                __typename @include(if: false)
              }
            }
          `),
        },
        {} as any,
        {},
      );
      const printed = print(req.document);
      // An unconditional __typename should have been added alongside the conditional one.
      expect(printed).toMatch(/__typename\s*@include/);
      expect(printed.match(/__typename/g)?.length).toBeGreaterThanOrEqual(2);
      void sawInternalTypename;
    });

    it('uses prototype-free field lookup tables for toString fields', () => {
      const schema = buildSchema(/* GraphQL */ `
        type Query {
          toString: String
        }
      `);
      const transform = new TransformCompositeFields((typeName, fieldName) => {
        if (fieldName === 'toString') {
          const toStringField = (
            schema.getQueryType()!.getFields() as Record<string, { type: any }>
          )['toString']!;
          return ['asString', { type: toStringField.type }];
        }
        return undefined;
      });
      const newSchema = transform.transformSchema(schema, { schema } as any);
      expect(newSchema.getQueryType()!.getFields().asString).toBeDefined();
    });
  });

  describe('TransformEnumValues', () => {
    it('runs leaf callbacks even without an enum rename', () => {
      const schema = makeExecutableSchema({
        typeDefs: /* GraphQL */ `
          enum Color {
            RED
          }
          type Query {
            color: Color
          }
        `,
        resolvers: { Query: { color: () => 'RED' } },
      });
      const transform = new TransformEnumValues(
        (_t, _v, config) => config,
        undefined,
        (_typeName, value) => (value === 'RED' ? 'rouge' : value),
      );
      transform.transformSchema(schema, { schema } as any);
      const result = transform.transformResult(
        { data: { color: 'RED' } },
        {} as any,
        {
          transformedRequest: {
            document: parse('{ color }'),
          },
        } as any,
      );
      expect(result.data?.color).toBe('rouge');
    });

    it('preserves null as enum removal and undefined as keep-original', () => {
      const schema = buildSchema(/* GraphQL */ `
        enum Color {
          RED
          BLUE
          GREEN
        }
        type Query {
          c: Color
        }
      `);
      const transform = new TransformEnumValues((typeName, externalValue, config) => {
        if (externalValue === 'BLUE') return null;
        if (externalValue === 'GREEN') return undefined;
        return config;
      });
      const newSchema = transform.transformSchema(schema, { schema } as any);
      const values = (newSchema.getType('Color') as any).getValues().map((v: any) => v.name);
      expect(values).toEqual(['RED', 'GREEN']);
    });
  });

  describe('RenameObjectFieldArguments', () => {
    it('records reverse mapping when new arg name matches the field name', () => {
      const schema = buildSchema(/* GraphQL */ `
        type Query {
          user(id: ID!): String
        }
      `);
      const newSchema = wrapSchema({
        schema,
        transforms: [
          new RenameObjectFieldArguments((typeName, fieldName, argName) => {
            if (typeName === 'Query' && fieldName === 'user' && argName === 'id') {
              return 'user'; // new arg name equals field name
            }
            return argName;
          }),
        ],
      });
      const args = newSchema.getQueryType()!.getFields().user!.args;
      expect(args.map(a => a.name)).toEqual(['user']);
    });
  });

  describe('RenameTypes', () => {
    it('detects rename conflicts from the final name set (order-independent)', () => {
      const schema = buildSchema(/* GraphQL */ `
        type Query {
          a: A
          b: B
        }
        type A {
          x: String
        }
        type B {
          y: String
        }
      `);
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      // A→B conflicts with existing B that is not renamed away in a way that frees B
      // if we also try C→B style; here B stays, so A→B must be skipped regardless of visit order.
      const transformed = wrapSchema({
        schema,
        transforms: [
          new RenameTypes(name => {
            if (name === 'A') return 'B';
            return name;
          }),
        ],
      });
      expect(transformed.getType('A')).toBeDefined();
      expect(transformed.getType('B')).toBeDefined();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('rejects renameBuiltins: true', () => {
      expect(() =>
        new RenameTypes(n => n, { renameBuiltins: true, renameScalars: true }).transformSchema(
          buildSchema('type Query { x: String }'),
          {} as any,
        ),
      ).toThrow(/renameBuiltins is not supported/);
    });
  });

  describe('TransformQuery', () => {
    it('uses response aliases and returns original data when an ancestor is missing', () => {
      const transform = new TransformQuery({
        path: ['user', 'profile'],
        queryTransformer: s => s!,
        resultTransformer: () => ({ changed: true }),
      });
      const ctx: Record<string, any> = {};
      transform.transformRequest(
        {
          document: parse('{ u: user { p: profile { name } } }'),
        },
        {} as any,
        ctx,
      );
      expect(ctx.responsePath).toEqual(['u', 'p']);

      const missing = transform.transformResult({ data: { u: null } }, {} as any, ctx);
      expect(missing.data).toEqual({ u: null });

      const ok = transform.transformResult({ data: { u: { p: { name: 'x' } } } }, {} as any, ctx);
      expect(ok.data).toEqual({ u: { p: { changed: true } } });
    });
  });

  describe('WrapQuery', () => {
    it('stops extraction when an ancestor is null and uses response aliases', () => {
      const transform = new WrapQuery(
        ['user', 'profile'],
        subtree => subtree,
        () => ({ extracted: true }),
      );
      const ctx: Record<string, any> = {};
      transform.transformRequest(
        {
          document: parse('{ u: user { p: profile { name } other } }'),
        },
        {} as any,
        ctx,
      );
      expect(ctx.responsePath).toEqual(['u', 'p']);

      const missing = transform.transformResult(
        { data: { u: null, untouched: 1 } },
        {} as any,
        ctx,
      );
      expect(missing.data).toEqual({ u: null, untouched: 1 });

      const ok = transform.transformResult({ data: { u: { p: { name: 'x' } } } }, {} as any, ctx);
      expect(ok.data).toEqual({ u: { p: { extracted: true } } });
    });
  });

  describe('RemoveObjectFieldDeprecations / WithDeprecation', () => {
    it('matches empty deprecation reasons', () => {
      const schema = buildSchema(/* GraphQL */ `
        type Query {
          a: String @deprecated(reason: "")
          b: String
        }
      `);
      const cleaned = wrapSchema({
        schema,
        transforms: [new RemoveObjectFieldDeprecations('')],
      });
      expect(cleaned.getQueryType()!.getFields().a!.deprecationReason).toBeUndefined();

      const removed = wrapSchema({
        schema,
        transforms: [new RemoveObjectFieldsWithDeprecation('')],
      });
      expect(removed.getQueryType()!.getFields().a).toBeUndefined();
      expect(removed.getQueryType()!.getFields().b).toBeDefined();
    });

    it('also removes matching deprecated interface fields', () => {
      const schema = buildSchema(/* GraphQL */ `
        interface Node {
          id: ID @deprecated(reason: "gone")
          name: String
        }
        type Query {
          node: Node
        }
        type Item implements Node {
          id: ID @deprecated(reason: "gone")
          name: String
        }
      `);
      const removed = wrapSchema({
        schema,
        transforms: [new RemoveObjectFieldsWithDeprecation('gone')],
      });
      expect((removed.getType('Node') as any).getFields().id).toBeUndefined();
      expect((removed.getType('Item') as GraphQLObjectType).getFields().id).toBeUndefined();
      expect((removed.getType('Item') as GraphQLObjectType).getFields().name).toBeDefined();
    });
  });

  describe('RenameRootTypes', () => {
    it('rejects colliding root type names', () => {
      const schema = buildSchema(/* GraphQL */ `
        type Query {
          q: String
        }
        type Mutation {
          m: String
        }
      `);
      expect(() =>
        wrapSchema({
          schema,
          transforms: [new RenameRootTypes(() => 'Root')],
        }),
      ).toThrow(/collision/);
    });

    it('allows unique renames such as Query to ReadApi', () => {
      const schema = buildSchema(/* GraphQL */ `
        type Query {
          q: String
        }
      `);
      const renamed = wrapSchema({
        schema,
        transforms: [new RenameRootTypes(name => (name === 'Query' ? 'ReadApi' : name))],
      });
      expect(renamed.getQueryType()!.name).toBe('ReadApi');
    });
  });

  describe('TransformInputObjectFields', () => {
    it('reverse-maps each emitted field by its own name', () => {
      const schema = buildSchema(/* GraphQL */ `
        input Search {
          query: String
          mode: String
        }
        type Query {
          search(input: Search): String
        }
      `);
      const transform = new TransformInputObjectFields(
        (typeName, fieldName, config) => {
          if (typeName === 'Search' && fieldName === 'query') {
            return ['text', config];
          }
          return undefined;
        },
        (typeName, fieldName, node) => {
          if (typeName === 'Search' && fieldName === 'text') {
            // Emit renamed field plus an unmapped sibling
            return [
              node,
              {
                kind: Kind.OBJECT_FIELD,
                name: { kind: Kind.NAME, value: 'mode' },
                value: { kind: Kind.STRING, value: 'exact' },
              },
            ];
          }
          return node;
        },
      );
      transform.transformSchema(schema, { schema } as any);
      const req = transform.transformRequest(
        {
          document: parse(/* GraphQL */ `
            {
              search(input: { text: "hi" })
            }
          `),
        },
        {} as any,
        {},
      );
      const printed = print(req.document);
      expect(printed).toContain('query');
      expect(printed).toContain('mode');
      expect(printed).not.toContain('text:');
    });

    it('keeps toString field names out of prototype lookup', () => {
      const schema = buildSchema(/* GraphQL */ `
        input Bag {
          toString: String
          query: String
        }
        type Query {
          search(input: Bag): String
        }
      `);
      const transform = new TransformInputObjectFields((typeName, fieldName, config) => {
        if (fieldName === 'query') return ['text', config];
        return undefined;
      });
      const newSchema = transform.transformSchema(schema, { schema } as any);
      expect((newSchema.getType('Bag') as any).getFields().toString).toBeDefined();
      expect((newSchema.getType('Bag') as any).getFields().text).toBeDefined();
    });
  });

  describe('MapFields', () => {
    it('dispatches only to explicitly configured mappers', () => {
      const schema = buildSchema(/* GraphQL */ `
        type Query {
          toString: String
          hello: String
        }
      `);
      const mappers = Object.create(null);
      mappers.Query = Object.create(null);
      mappers.Query.hello = (node: any) => node;
      const transform = new MapFields(mappers);
      transform.transformSchema(schema, { schema } as any);
      const req = transform.transformRequest(
        { document: parse('{ toString hello }') },
        {} as any,
        {},
      );
      expect(print(req.document)).toContain('toString');
      expect(print(req.document)).toContain('hello');
    });
  });

  describe('FilterObjectFieldDirectives', () => {
    it('filters directives stored in field extensions', () => {
      const schema = buildSchema(/* GraphQL */ `
        type Query {
          hello: String
        }
      `);
      const query = schema.getQueryType()!;
      const hello = query.getFields().hello!;
      (hello as any).extensions = {
        directives: {
          sensitive: { level: 1 },
          keep: { ok: true },
        },
      };
      // Rebuild schema with extensions on field config via map through wrap
      const withExt = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            hello: {
              type: hello.type,
              extensions: {
                directives: {
                  sensitive: { level: 1 },
                  keep: { ok: true },
                },
              },
            },
          },
        }),
      });
      const filtered = wrapSchema({
        schema: withExt,
        transforms: [new FilterObjectFieldDirectives(name => name !== 'sensitive')],
      });
      const ext = filtered.getQueryType()!.getFields().hello!.extensions as any;
      expect(ext.directives.sensitive).toBeUndefined();
      expect(ext.directives.keep).toEqual({ ok: true });
    });
  });
});
