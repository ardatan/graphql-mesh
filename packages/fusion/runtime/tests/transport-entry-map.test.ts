import { buildSchema } from 'graphql';
import { getTransportEntryMapUsingFusionAndFederationDirectives } from '../src/utils.js';

describe('getTransportEntryMapUsingFusionAndFederationDirectives', () => {
  it('does not write resolved transport entries onto the input schema extensions', () => {
    const schema = buildSchema(`
      type Query {
        hello: String
      }
    `);
    const before = schema.extensions;
    getTransportEntryMapUsingFusionAndFederationDirectives(schema, {
      '*': { kind: 'http', location: 'http://example.com/graphql' },
    });
    expect(schema.extensions).toBe(before);
    expect((schema.extensions as any)?.directives?.transport).toBeUndefined();
  });

  it('accepts specs.graphql-mesh.dev @link URLs (v0.1)', () => {
    const schema = buildSchema(
      /* GraphQL */ `
        extend schema @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@transport"])

        directive @link(
          url: String
          as: String
          for: link__Purpose
          import: [link__Import]
        ) repeatable on SCHEMA

        directive @transport(subgraph: String, kind: String, location: String) on SCHEMA

        scalar link__Import

        enum link__Purpose {
          SECURITY
          EXECUTION
        }

        type Query {
          hello: String
        }
      `,
      { assumeValid: true },
    );

    expect(() =>
      getTransportEntryMapUsingFusionAndFederationDirectives(schema, {
        '*': { kind: 'http', location: 'http://example.com/graphql' },
      }),
    ).not.toThrow();
  });

  it('rejects unsupported specs.graphql-mesh.dev versions', () => {
    const schema = buildSchema(
      /* GraphQL */ `
        extend schema @link(url: "https://specs.graphql-mesh.dev/core/v9.9", import: ["@transport"])

        directive @link(
          url: String
          as: String
          for: link__Purpose
          import: [link__Import]
        ) repeatable on SCHEMA

        scalar link__Import

        enum link__Purpose {
          SECURITY
          EXECUTION
        }

        type Query {
          hello: String
        }
      `,
      { assumeValid: true },
    );

    expect(() => getTransportEntryMapUsingFusionAndFederationDirectives(schema)).toThrow(
      /unsupported Mesh spec "core" version v9\.9/,
    );
  });
});
