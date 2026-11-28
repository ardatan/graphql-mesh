import { parse } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  getBackboneExecutor,
  getOriginalRootResolve,
  stitchSchemas,
} from '@graphql-tools/stitch';
import { isAsyncIterable, MapperKind, mapSchema, type ExecutionResult } from '@graphql-tools/utils';

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

describe('filter before backbone attach', () => {
  it('plain stitch keeps local root Island after attach; getBackboneExecutor derives without storage', async () => {
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
    const schema = stitchSchemas({
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
    const localField = schema.getQueryType()!.getFields()['localUsers']!;
    expect(getOriginalRootResolve(localField)).toBeTruthy();
    const executor = getBackboneExecutor(schema);
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

  it('ORIGINAL_RESOLVE on proxy survives mapSchema toConfig; local Island still runs', async () => {
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
    // Rebuild field configs (drop field-config symbols) but keep resolve fn refs —
    // ORIGINAL_RESOLVE must be readable from the proxy stamp.
    schema = mapSchema(schema, {
      [MapperKind.QUERY_ROOT_FIELD]: fieldConfig => ({ ...fieldConfig }),
    });
    const localField = schema.getQueryType()!.getFields()['localUsers']!;
    expect((localField as any)[Symbol.for('graphql-tools.stitch.backboneOriginalResolve')]).toBeUndefined();
    expect(getOriginalRootResolve(localField)).toBeTruthy();
    const executor = getBackboneExecutor(schema);
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
  });

  it('getBackboneExecutor forces bound schema when info.schema is an outer gateway', async () => {
    const subgraph = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      resolvers: {
        Query: {
          hello: () => 'hi',
        },
      },
    });
    const inner = stitchSchemas({
      subschemas: [
        {
          schema: subgraph,
          executor: createDefaultExecutor(subgraph),
        },
      ],
    });
    const outer = makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
    });
    const executor = getBackboneExecutor(inner);
    const result = await execResult(executor, {
      document: parse(`{ hello }`),
      context: {},
      // Nested-subschema case: delegation info points at the outer schema.
      info: { schema: outer } as any,
    });
    expect(result.errors).toBeUndefined();
    expect((result.data as any).hello).toBe('hi');
  });
});
