import { buildSchema } from 'graphql';
import { validateMeshDirectives } from '../src/validate-mesh-directives';

describe('validateMeshDirectives (GM-37)', () => {
  it('accepts core @link + valid @transport', () => {
    const schema = buildSchema(/* GraphQL */ `
      extend schema
        @link(url: "https://specs.graphql-mesh.dev/core/v0.1", import: ["@transport"])
        @transport(subgraph: "chinook", kind: "sql", location: "file:chinook.db")

      directive @link(url: String, import: [String]) repeatable on SCHEMA
      directive @transport(subgraph: String, kind: String!, location: String) repeatable on SCHEMA

      type Query {
        ok: String
      }
    `);
    (schema.extensions as any) = {
      directives: {
        link: [
          {
            url: 'https://specs.graphql-mesh.dev/core/v0.1',
            import: ['@transport'],
          },
        ],
        transport: [{ subgraph: 'chinook', kind: 'sql', location: 'file:chinook.db' }],
      },
    };
    expect(() => validateMeshDirectives(schema)).not.toThrow();
  });

  it('rejects non-string @transport.kind', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        ok: String
      }
    `);
    (schema.extensions as any) = {
      directives: {
        link: [{ url: 'https://specs.graphql-mesh.dev/core/v0.1', import: ['@transport'] }],
        transport: [{ kind: 1 }],
      },
    };
    expect(() => validateMeshDirectives(schema)).toThrow(/@transport\.kind must be a string/);
  });

  it('rejects unsupported Mesh spec version', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        ok: String
      }
    `);
    (schema.extensions as any) = {
      directives: {
        link: [{ url: 'https://specs.graphql-mesh.dev/core/v9.9', import: ['@transport'] }],
        transport: [{ kind: 'sql' }],
      },
    };
    expect(() => validateMeshDirectives(schema)).toThrow(/unsupported Mesh spec/);
  });

  it('rejects @transport without kind', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        ok: String
      }
    `);
    (schema.extensions as any) = {
      directives: {
        link: [{ url: 'https://specs.graphql-mesh.dev/core/v0.1', import: ['@transport'] }],
        transport: [{ subgraph: 'chinook', location: 'file:chinook.db' }],
      },
    };
    expect(() => validateMeshDirectives(schema)).toThrow(/@transport\.kind is required/);
  });

  it('allows options-only @transport without kind (Gateway-inferred connect)', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        ok: String
      }
    `);
    (schema.extensions as any) = {
      directives: {
        link: [{ url: 'https://specs.graphql-mesh.dev/core/v0.1', import: ['@transport'] }],
        transport: [{ options: { odata: { batch: 'json' } } }],
      },
    };
    expect(() => validateMeshDirectives(schema)).not.toThrow();
  });

  it('rejects non-array @hoist.pathConfig', () => {
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        ok: String
      }
    `);
    (schema.extensions as any) = {
      directives: {
        link: [{ url: 'https://specs.graphql-mesh.dev/core/v0.1', import: ['@hoist'] }],
      },
    };
    const query = schema.getType('Query') as any;
    query.getFields().ok.extensions = {
      directives: { hoist: [{ pathConfig: 'user.name' }] },
    };
    expect(() => validateMeshDirectives(schema)).toThrow(/@hoist\.pathConfig must be an array/);
  });
});
