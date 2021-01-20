import { getMesh } from '@graphql-mesh/runtime';
import OpenAPIHandler from '@graphql-mesh/openapi';
import BareMerger from '@graphql-mesh/merger-bare';
import { KeyValueCache } from '@graphql-mesh/types';
import { PubSub } from 'graphql-subscriptions';
import CacheTransform from '@graphql-mesh/transform-cache';

export function getMeshInstance({ cache }: { cache: KeyValueCache }) {
  const meshContext = {
    cache,
    pubsub: new PubSub(),
  };
  return getMesh({
    sources: [
      {
        name: 'Weatherbit',
        handler: new OpenAPIHandler({
          name: 'Weatherbit',
          config: {
            source: 'https://www.weatherbit.io/static/swagger.json',
          },
          ...meshContext,
        }),
        transforms: [
          new CacheTransform({
            apiName: 'Weatherbit',
            config: [
              {
                field: 'Query.getForecastDailyLatequalToLatLonLon',
                invalidate: {
                  ttl: 10 * 60 * 60 * 24, // Cache daily data for 24 hours
                },
              },
            ],
            ...meshContext,
          }),
        ],
      },
    ],
    merger: BareMerger, // we can use BareMerger since we don't need a real merger at all
    ...meshContext,
  });
}
