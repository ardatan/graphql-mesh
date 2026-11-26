import { GraphQLError, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { IncrementalReceiver } from '../src/IncrementalReceiver.js';
import { RECEIVER_SYMBOL } from '../src/symbols.js';

function makeReceiver(fieldName = 'product') {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: { product: { type: GraphQLString } },
    }),
  });
  return new IncrementalReceiver({
    fieldName,
    subschema: schema,
    targetSchema: schema,
    operation: 'query',
    info: {
      path: { key: fieldName, prev: undefined, typename: 'Query' },
    },
  } as any);
}

describe('IncrementalReceiver', () => {
  it('resolves v0.2 incremental ids to pending paths before merge', async () => {
    const receiver = makeReceiver();
    const root: Record<string, any> = { id: '1' };
    receiver.attachTo(root);

    const waiter = receiver.requestField(root, 'name');

    receiver.handleChunk({
      pending: [{ id: '0', path: ['product'] }],
      hasNext: true,
    } as any);
    receiver.handleChunk({
      incremental: [{ id: '0', data: { name: 'Widget' } }],
      hasNext: false,
    } as any);

    await expect(waiter).resolves.toBe('Widget');
    expect(root.name).toBe('Widget');
  });

  it('does not merge patches with unknown v0.2 ids at the root', async () => {
    const receiver = makeReceiver();
    const root: Record<string, any> = { id: '1' };
    receiver.attachTo(root);
    receiver.handleChunk({
      incremental: [{ id: 'missing', data: { name: 'nope' } }],
      hasNext: false,
    } as any);
    expect(root.name).toBeUndefined();
  });

  it('attaches the receiver to streamed object items', () => {
    const receiver = makeReceiver('items');
    // Production attaches to the delegated field value (the list itself).
    const list: any[] = [];
    receiver.attachTo(list);

    receiver.handleChunk({
      incremental: [
        {
          path: ['items', 0],
          items: [{ id: 'a', __typename: 'Item' }],
        },
      ],
      hasNext: false,
    } as any);

    expect(list[0][RECEIVER_SYMBOL]).toBe(receiver);
  });

  it('inserts missing list items from accumulated snapshots', async () => {
    const receiver = makeReceiver('items');
    const list: any[] = [{ id: 'a' }];
    receiver.attachTo(list);

    // streamList expects info.path at the list field; it yields index 0, 1, …
    const streamed = receiver.streamList({
      path: { key: 'items', prev: undefined, typename: 'Query' },
      fieldName: 'items',
    } as any);
    const iter = streamed[Symbol.asyncIterator]();

    // Index 0 is already present on the attached list.
    await expect(iter.next()).resolves.toMatchObject({ value: { id: 'a' }, done: false });

    receiver.handleChunk({
      data: {
        items: [{ id: 'a' }, { id: 'b' }],
      },
      hasNext: false,
    } as any);

    await expect(iter.next()).resolves.toMatchObject({ value: { id: 'b' }, done: false });
    expect(list[1][RECEIVER_SYMBOL]).toBe(receiver);
  });

  it('routes error-only patches to identity-based field waiters', async () => {
    const receiver = makeReceiver();
    const root: Record<string, any> = { id: '1' };
    receiver.attachTo(root);
    const waiter = receiver.requestField(root, 'name');

    receiver.handleChunk({
      incremental: [
        {
          path: ['product'],
          errors: [new GraphQLError('boom', { path: ['product', 'name'] })],
        },
      ],
      hasNext: false,
    } as any);

    const result = await waiter;
    expect(result).toBeInstanceOf(GraphQLError);
    expect((result as GraphQLError).message).toBe('boom');
  });

  it('locates nested errors relative to the patch path', () => {
    const receiver = makeReceiver();
    const root: Record<string, any> = { id: '1' };
    receiver.attachTo(root);

    receiver.handleChunk({
      incremental: [
        {
          path: ['product'],
          data: { profile: { name: null } },
          errors: [new GraphQLError('bad name', { path: ['product', 'profile', 'name'] })],
        },
      ],
      hasNext: false,
    } as any);

    expect(root.profile.name).toBeInstanceOf(GraphQLError);
    expect(root.profile.name.message).toBe('bad name');
  });
});
