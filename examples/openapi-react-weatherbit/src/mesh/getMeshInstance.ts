import { getMesh } from '@graphql-mesh/runtime';
import OpenapiHandler from '@graphql-mesh/openapi';
import StitchingMerger from '@graphql-mesh/merger-stitching';
import { EventEmitter } from 'events';
import { Hooks } from '@graphql-mesh/types';
import { KeyValueCache } from '@graphql-mesh/types';

export function getMeshInstance({ cache }: { cache: KeyValueCache }) {
  return getMesh({
    sources: [
      {
        name: 'Weatherbit',
        handlerConfig: {
          source: 'https://www.weatherbit.io/static/swagger.json',
        },
        handlerLibrary: OpenapiHandler as any,
      },
    ],
    cache,
    merger: StitchingMerger,
    hooks: new EventEmitter() as Hooks,
  });
}
