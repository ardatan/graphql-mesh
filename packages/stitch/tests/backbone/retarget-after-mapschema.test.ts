import { parse } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  getBackboneExecutor,
  getOriginalRootResolve,
  retargetBackboneToSchema,
  stitchSchemas,
} from '@graphql-tools/stitch';
import { isAsyncIterable, type ExecutionResult } from '@graphql-tools/utils';
import { filterInternalFieldsAndTypes } from '../../../federation/src/utils.js';

async function execResult(
  executor: NonNullable<ReturnType<typeof getBackboneExecutor>>,
  request: Parameters<NonNullable<ReturnType<typeof getBackboneExecutor>>>[0],
): Promise<ExecutionResult> {
  const result = await executor(request);
  if (isAsyncIterable(result)) {
    throw new Error('Expected ExecutionResult, got AsyncIterable');
  }
  return result;
}

describe('retargetBackboneToSchema after mapSchema', () => {
  it('pre-existing local root keeps ORIGINAL_RESOLVE after mapSchema retarget', async () => {
    let localHits = 0;
    const subgraph = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
        }
        type Query {
          users: [User]
        }
      `,
      resolvers: {
        Query: {
          users: () => [{ id: 'u1' }],
        },
      },
    });
    let schema = stitchSchemas({
      subschemas: [
        {
          schema: subgraph,
          executor: createDefaultExecutor(subgraph),
        },
      ],
      typeDefs: /* GraphQL */ `
        extend type Query {
          localUsers: [User]
        }
      `,
      resolvers: {
        Query: {
          localUsers: () => {
            localHits++;
            return [{ id: 'L1' }];
          },
        },
      },
    });
    const stitchingInfo = schema.extensions?.stitchingInfo as {
      localFields?: Map<string, Set<string>>;
    };
    expect(stitchingInfo.localFields?.get('Query')?.has('localUsers')).toBe(true);
    schema = filterInternalFieldsAndTypes(schema);
    schema = retargetBackboneToSchema(schema);
    const localField = schema.getQueryType()!.getFields()['localUsers']!;
    expect(getOriginalRootResolve(localField)).toBeTruthy();
    const executor = getBackboneExecutor(schema)!;
    const result = await execResult(executor, {
      document: parse(`{
        users { id }
        localUsers { id }
      }`),
      context: {},
    });
    expect(result.errors).toBeUndefined();
    expect(localHits).toBeGreaterThan(0);
    expect((result.data as any).localUsers[0].id).toBe('L1');
    expect((result.data as any).users[0].id).toBe('u1');
  });

  it('late onStitchedSchema root override runs as Island in multi-root plan', async () => {
    const { getStitchedSchemaFromSupergraphSdl } = await import(
      '../../../federation/src/supergraph.js'
    );
    let overrideHits = 0;
    const subgraph = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type User {
          id: ID!
        }
        type Query {
          users: [User]
          secondUsers: [User]
        }
      `,
      resolvers: {
        Query: {
          users: () => [{ id: 'u1' }],
          secondUsers: () => [{ id: 's1' }],
        },
      },
    });
    const supergraphSdl = /* GraphQL */ `
      schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
        @link(url: "https://specs.apollo.dev/join/v0.3", for: EXECUTION) {
        query: Query
      }
      directive @join__graph(name: String!, url: String!) on ENUM_VALUE
      directive @join__field(
        graph: join__Graph
        requires: join__FieldSet
        provides: join__FieldSet
        type: String
        external: Boolean
        override: String
        usedOverridden: Boolean
      ) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
      directive @join__type(
        graph: join__Graph!
        key: join__FieldSet
        extension: Boolean! = false
        resolvable: Boolean! = true
        isInterfaceObject: Boolean! = false
      ) on OBJECT | INTERFACE | UNION | ENUM | INPUT_OBJECT | SCALAR
      directive @link(
        url: String
        as: String
        for: link__Purpose
        import: [link__Import]
      ) repeatable on SCHEMA
      scalar join__FieldSet
      scalar link__Import
      enum link__Purpose {
        SECURITY
        EXECUTION
      }
      enum join__Graph {
        ACCOUNTS @join__graph(name: "accounts", url: "http://accounts")
      }
      type User @join__type(graph: ACCOUNTS, key: "id") {
        id: ID!
      }
      type Query @join__type(graph: ACCOUNTS) {
        users: [User]
        secondUsers: [User]
      }
    `;
    const schema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl,
      onSubschemaConfig(subschema) {
        subschema.executor = createDefaultExecutor(subgraph);
      },
      onStitchedSchema(s) {
        const field = s.getQueryType()!.getFields()['users']!;
        const original = getOriginalRootResolve(field)!;
        field.resolve = (root, args, ctx, info) => {
          overrideHits++;
          return original(root, args, ctx, info);
        };
        return s;
      },
    });
    const stitchingInfo = schema.extensions?.stitchingInfo as {
      localFields?: Map<string, Set<string>>;
    };
    expect(stitchingInfo.localFields?.get('Query')?.has('users')).toBe(true);
    const executor = getBackboneExecutor(schema)!;
    const result = await execResult(executor, {
      document: parse(`{
        secondUsers { id }
        users { id }
      }`),
      context: {},
    });
    expect(result.errors).toBeUndefined();
    expect(overrideHits).toBeGreaterThan(0);
    expect((result.data as any).users[0].id).toBe('u1');
    expect((result.data as any).secondUsers[0].id).toBe('s1');
  });
});
