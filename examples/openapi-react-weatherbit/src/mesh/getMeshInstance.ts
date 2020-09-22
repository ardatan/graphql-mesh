import { getMesh } from '@graphql-mesh/runtime';
import OpenAPIHandler from '@graphql-mesh/openapi';
import StitchingMerger from '@graphql-mesh/merger-stitching';
import { MeshPubSub } from '@graphql-mesh/types';
import { KeyValueCache } from '@graphql-mesh/types';
import { PubSub } from 'graphql-subscriptions';

export function getMeshInstance({ cache }: { cache: KeyValueCache }) {
  const pubSub = new PubSub() as MeshPubSub;
  return getMesh({
    sources: [
      {
        name: 'Weatherbit',
        handler: new OpenAPIHandler({
          name: 'Weatherbit',
          cache,
          pubSub,
          config: {
            source: 'https://www.weatherbit.io/static/swagger.json',
          },
        }),
      },
    ],
    cache,
    pubSub,
    merger: StitchingMerger,
  });
}
