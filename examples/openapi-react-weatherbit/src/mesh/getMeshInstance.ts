import { getMesh } from '@graphql-mesh/runtime';
import OpenAPIHandler from '@graphql-mesh/openapi';
import StitchingMerger from '@graphql-mesh/merger-stitching';
import { EventEmitter } from 'events';
import { Hooks } from '@graphql-mesh/types';
import { KeyValueCache } from '@graphql-mesh/types';

export function getMeshInstance({ cache }: { cache: KeyValueCache }) {
  const hooks = new EventEmitter() as Hooks;
  return getMesh({
    sources: [
      {
        name: 'Weatherbit',
        handler: new OpenAPIHandler({
          name: 'Weatherbit',
          cache,
          hooks,
          config: {
            source: 'https://www.weatherbit.io/static/swagger.json',
          },
        }),
      },
    ],
    cache,
    hooks,
    merger: StitchingMerger,
  });
}
