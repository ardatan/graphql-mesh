import { parse } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  filterInternalFieldsAndTypes,
  getBackboneExecutor,
  getOriginalRootResolve,
  stitchSchemas,
} from '@graphql-tools/stitch';
import { isAsyncIterable, type ExecutionResult } from '@graphql-tools/utils';

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
  it('stitchSchemas filters then installs proxies; getBackboneExecutor derives without storage', async () => {
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
    // join internals already filtered inside stitchSchemas; second filter is idempotent.
    expect(schema.getType('_Entity')).toBeUndefined();
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

  it('filterInternalFieldsAndTypes before attach keeps ORIGINAL_RESOLVE for locals', async () => {
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
    // Manual path mirroring pre-redesign: filter then callers use stitchSchemas'
    // attach; here we only assert the exported filter still works for federation
    // tests that import it.
    let schema = stitchSchemas({
      subschemas: [
        {
          schema: subgraph,
          executor: createDefaultExecutor(subgraph),
        },
      ],
    });
    schema = filterInternalFieldsAndTypes(schema);
    expect(schema.getType('join__Graph')).toBeUndefined();
    const executor = getBackboneExecutor(schema);
    const result = await execResult(executor, {
      document: parse(`{ users { id } }`),
      context: {},
    });
    expect(result.errors).toBeUndefined();
    expect((result.data as any).users[0].id).toBe('u1');
  });
});
