import { getMesh } from '@graphql-mesh/runtime';
import OpenAPIHandler from '@graphql-mesh/openapi';
import BareMerger from '@graphql-mesh/merger-bare';
import { MeshPubSub } from '@graphql-mesh/types';
import { KeyValueCache } from '@graphql-mesh/types';
import { PubSub } from 'graphql-subscriptions';
import CacheTransform from '@graphql-mesh/transform-cache';

export function getMeshInstance({ cache }: { cache: KeyValueCache }) {
  const pubsub = new PubSub() as MeshPubSub;
  return getMesh({
    sources: [
      {
        name: 'Weatherbit',
        handler: new OpenAPIHandler({
          name: 'Weatherbit',
          cache,
          pubsub,
          config: {
            source: 'https://www.weatherbit.io/static/swagger.json',
          },
        }),
        transforms: [
          new CacheTransform({
            config: [
              {
                field: 'Query.getForecastDailyLatequalToLatLonLon',
                invalidate: {
                  ttl: 10 * 60 * 60 * 24, // Cache daily data for 24 hours
                },
              },
            ],
            cache,
            pubsub,
            apiName: 'Weatherbit',
          }),
        ],
      },
    ],
    cache,
    pubsub,
    merger: BareMerger, // we can use BareMerger since we don't need a real merger at all
  });
}
