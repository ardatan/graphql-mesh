import { MeshConfig } from './config';
import { cosmiconfig } from 'cosmiconfig';
import { GetMeshOptions, Transformation } from './types';
import { getHandler, getPackage, resolveAdditionalResolvers } from './utils';
import {
  OutputTransformationFn,
  SchemaTransformationFn
} from '@graphql-mesh/types';

export async function parseConfig(
  name = 'mesh',
  dir = process.cwd()
): Promise<GetMeshOptions> {

  const explorer = cosmiconfig(name);
  const results = await explorer.search(dir);
  const config = results?.config as MeshConfig;

  const sources = await Promise.all(
    config.sources.map(async source => {
      const transformations: Transformation<
        SchemaTransformationFn
      >[] = await Promise.all(
        (source.transformations || []).map(async t => {
          return {
            config: t,
            transformer: await getPackage<SchemaTransformationFn>(
              t.type,
              'source-transfomer'
            )
          };
        })
      );

      return {
        name: source.name,
        handler: await getHandler(source.handler.name),
        config: source.handler.config || {},
        source: source.source,
        context: source.context || {},
        transformations
      };
    })
  );

  const transformations: Transformation<
    OutputTransformationFn
  >[] = await Promise.all(
    (config.transformations || []).map(async t => {
      return {
        config: t,
        transformer: await getPackage<OutputTransformationFn>(
          t.type,
          'output-transfomer'
        )
      };
    })
  );

  const additionalResolvers = await resolveAdditionalResolvers(dir, config.additionalResolvers || []);

  return {
    sources,
    transformations,
    additionalResolvers
  };
}
