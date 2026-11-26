import { buildSchema, parse } from 'graphql';
import { federationToStitchingSDL } from '../src/federationToStitchingSDL.js';
import { stitchingDirectives } from '../src/stitchingDirectives.js';
import { stitchingDirectivesValidator } from '../src/stitchingDirectivesValidator.js';

describe('stitchingDirectivesTransformer / validator / federation SDL', () => {
  it('preserves alternative entity keys as separate key directives', () => {
    const sdl = federationToStitchingSDL(/* GraphQL */ `
      type User @key(fields: "id") @key(fields: "email") {
        id: ID!
        email: String!
        name: String
      }
    `);
    const keyDirectiveMatches = [...sdl.matchAll(/@key\(selectionSet: "([^"]+)"\)/g)].map(
      m => m[1],
    );
    expect(keyDirectiveMatches).toEqual(expect.arrayContaining(['{ id }', '{ email }']));
    expect(keyDirectiveMatches).toHaveLength(2);
  });

  it('does not mark programmatic field dependencies as computed', () => {
    const { stitchingDirectivesTransformer } = stitchingDirectives();
    const schema = buildSchema(/* GraphQL */ `
      directive @merge(keyField: String) on FIELD_DEFINITION
      type User {
        id: ID!
        profile: Profile
      }
      type Profile {
        id: ID!
      }
      type Query {
        user(id: ID!): User @merge(keyField: "id")
      }
    `);
    const result = stitchingDirectivesTransformer({
      schema,
      merge: {
        User: {
          fields: {
            profile: {
              selectionSet: '{ id }',
            },
          },
        },
      },
    });
    expect(result.merge?.User?.fields?.profile?.selectionSet).toContain('id');
    expect(result.merge?.User?.fields?.profile?.computed).not.toBe(true);
  });

  it('builds a nested selection for a dotted keyField', () => {
    const { stitchingDirectivesTransformer } = stitchingDirectives();
    const schema = buildSchema(/* GraphQL */ `
      directive @merge(keyField: String, keyArg: String) on FIELD_DEFINITION
      type User {
        organization: Organization
      }
      type Organization {
        id: ID!
      }
      type Query {
        users(organizationId: ID!): [User!]!
          @merge(keyField: "organization.id", keyArg: "organizationId")
      }
    `);
    const result = stitchingDirectivesTransformer({ schema });
    const entry =
      result.merge?.User?.entryPoints?.[0] ??
      (result.merge?.User as { selectionSet?: string } | undefined);
    expect(JSON.stringify(result.merge?.User)).toContain('organization');
    expect(entry?.selectionSet ?? result.merge?.User?.selectionSet ?? '').toMatch(/organization/);
  });

  it('validates argsExpr against the merge field return shape', () => {
    const validate = stitchingDirectivesValidator();
    const badBatch = buildSchema(/* GraphQL */ `
      directive @merge(argsExpr: String) on FIELD_DEFINITION
      type User {
        id: ID!
      }
      type Query {
        users(id: ID!): [User!]! @merge(argsExpr: "id: $key.id")
      }
    `);
    expect(() => validate(badBatch)).toThrow(/expansion/i);

    const badSingleton = buildSchema(/* GraphQL */ `
      directive @merge(argsExpr: String) on FIELD_DEFINITION
      type User {
        id: ID!
      }
      type Query {
        user(ids: [ID!]!): User @merge(argsExpr: "ids: [[$key.id]]")
      }
    `);
    expect(() => validate(badSingleton)).toThrow(/expansion/i);
  });

  it('parses federation SDL output', () => {
    const sdl = federationToStitchingSDL(/* GraphQL */ `
      type User @key(fields: "id") {
        id: ID!
        name: String
      }
    `);
    expect(() => parse(sdl)).not.toThrow();
  });
});
