import { getMesh } from '@graphql-mesh/runtime';
import OpenAPIHandler from '@graphql-mesh/openapi';
import StitchingMerger from '@graphql-mesh/merger-stitching';
import { PubSub } from 'graphql-subscriptions';

export function getMeshInstance({ cache }: { cache: any }) {
  const pubsub = new PubSub() as any;
  return getMesh({
    sources: [
      {
        name: 'Weatherbit',
        handler: new OpenAPIHandler('Weatherbit', {
          source: 'https://www.weatherbit.io/static/swagger.json',
        }),
      },
    ],
    cache,
    pubsub,
    merger: StitchingMerger,
  });
}
