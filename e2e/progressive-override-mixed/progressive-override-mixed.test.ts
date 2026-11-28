import { createTenv } from '@e2e/tenv';

describe('Progressive Override', () => {
  const { serve, service, composeWithApollo } = createTenv(__dirname);

  it('composes as expected', async () => {
    await using serviceA = await service('a');
    await using serviceB = await service('b');
    const supergraph = await composeWithApollo({
      services: [serviceA, serviceB],
      maskServicePorts: true,
    });
    expect(supergraph.result).toMatchSnapshot();
  });

  it('progressive_override_label_test', async () => {
    const query = /* GraphQL */ `
      query {
        feed {
          id
        }
      }
    `;
    {
      await using serviceA = await service('a');
      await using serviceB = await service('b');
      const { output } = await composeWithApollo({
        services: [serviceA, serviceB],
      });
      await using gw = await serve({
        supergraph: output,
        env: {
          // @override(label: "feed_in_b")
          OVERRIDE_LABELS: 'feed_in_b',
        },
      });
      const result = await gw.execute({ query });
      expect(result).toEqual({
        data: {
          feed: [{ id: 'b-1' }, { id: 'b-2' }, { id: 'b-3' }],
        },
      });

      // No request in A
      const ALogs = serviceA.getStd('out');
      expect(ALogs).not.toContain('received query');

      // Request in B
      const BLogs = serviceB.getStd('out');
      expect(BLogs).toContain('received query');
    }
    {
      await using serviceA = await service('a');
      await using serviceB = await service('b');
      const { output } = await composeWithApollo({
        services: [serviceA, serviceB],
      });
      await using gw = await serve({
        supergraph: output,
        env: {
          // @override(label: "feed_in_b")
          OVERRIDE_LABELS: 'different_flag',
        },
      });
      const result = await gw.execute({ query });
      expect(result).toEqual({
        data: {
          feed: [{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }],
        },
      });

      // Request in A
      const ALogs = serviceA.getStd('out');
      expect(ALogs).toContain('received query');

      // No request in B
      const BLogs = serviceB.getStd('out');
      expect(BLogs).not.toContain('received query');
    }
  });

  it('progressive_override_percentage_test', async () => {
    const query = /* GraphQL */ `
      query {
        aFeed {
          id
          createdAt
        }
        bFeed {
          id
          createdAt
        }
      }
    `;

    {
      await using serviceA = await service('a');
      await using serviceB = await service('b');
      const { output } = await composeWithApollo({
        services: [serviceA, serviceB],
      });
      await using gw = await serve({
        supergraph: output,
        env: {
          // @override(label: "percent(75)")
          PROGRESSIVE_OVERRIDE_RNG: '0.5',
        },
      });

      const result = await gw.execute({ query });
      expect(result).toEqual({
        data: {
          aFeed: [
            {
              id: 'a-1',
              createdAt: 'from-b:a-1',
            },
            {
              id: 'a-2',
              createdAt: 'from-b:a-2',
            },
            {
              id: 'a-3',
              createdAt: 'from-b:a-3',
            },
          ],
          bFeed: [
            {
              id: 'b-1',
              createdAt: 'from-b:b-1',
            },
            {
              id: 'b-2',
              createdAt: 'from-b:b-2',
            },
            {
              id: 'b-3',
              createdAt: 'from-b:b-3',
            },
          ],
        },
      });

      const ALogs = serviceA.getStd('out');
      const AReceivedQueries = ALogs.split('\n').filter(line => line.includes('received query'));
      expect(AReceivedQueries).toMatchInlineSnapshot(`
        [
          "[service-a] received query: {aFeed{id __typename}}",
        ]
      `);
      const BLogs = serviceB.getStd('out');
      const BReceivedQueries = BLogs.split('\n').filter(line => line.includes('received query'));
      expect(BReceivedQueries).toHaveLength(2);
      expect(BReceivedQueries[0]).toContain('[service-b] received query: {bFeed');
      expect(BReceivedQueries[0]).toContain('createdAt');

      expect(BReceivedQueries[1]).toContain(
        '[service-b] received query: query($__mesh_representations:[_Any!]!){_entities(representations:',
      );
      // Backbone entity hops ensure __typename on the fragment selection.
      expect(BReceivedQueries[1]).toMatch(/\.\.\.on Post\{(__typename )?createdAt/);
    }

    {
      await using serviceA = await service('a');
      await using serviceB = await service('b');
      const { output } = await composeWithApollo({
        services: [serviceA, serviceB],
      });
      await using gw = await serve({
        supergraph: output,
        env: {
          // @override(label: "percent(75)")
          PROGRESSIVE_OVERRIDE_RNG: '0.9',
        },
      });

      const result = await gw.execute({ query });
      expect(result).toEqual({
        data: {
          aFeed: [
            {
              id: 'a-1',
              createdAt: 'from-a:a-1',
            },
            {
              id: 'a-2',
              createdAt: 'from-a:a-2',
            },
            {
              id: 'a-3',
              createdAt: 'from-a:a-3',
            },
          ],
          bFeed: [
            {
              id: 'b-1',
              createdAt: 'from-a:b-1',
            },
            {
              id: 'b-2',
              createdAt: 'from-a:b-2',
            },
            {
              id: 'b-3',
              createdAt: 'from-a:b-3',
            },
          ],
        },
      });

      const ALogs = serviceA.getStd('out');
      const AReceivedQueries = ALogs.split('\n').filter(line => line.includes('received query'));
      expect(AReceivedQueries).toHaveLength(2);
      expect(AReceivedQueries[0]).toContain('[service-a] received query: {aFeed');
      expect(AReceivedQueries[0]).toContain('id createdAt');
      expect(AReceivedQueries[1]).toContain(
        '[service-a] received query: query($__mesh_nxt:[_Any!]!){_entities(representations:',
      );
      // Backbone entity hops ensure __typename on the fragment selection.
      expect(AReceivedQueries[1]).toMatch(/\.\.\.on Post\{(__typename )?createdAt/);
      const BLogs = serviceB.getStd('out');
      const BReceivedQueries = BLogs.split('\n').filter(line => line.includes('received query'));
      expect(BReceivedQueries).toMatchInlineSnapshot(`
        [
          "[service-b] received query: {bFeed{id __typename}}",
        ]
      `);
    }
  });
});
