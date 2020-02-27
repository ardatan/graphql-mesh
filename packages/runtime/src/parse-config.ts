import { cosmiconfig } from 'cosmiconfig';
import { GetMeshOptions, Transformation } from './types';
import { getHandler, getPackage, resolveAdditionalResolvers } from './utils';
import { TransformFn, YamlConfig } from '@graphql-mesh/types';

export async function parseConfig(
  name = 'mesh',
  dir = process.cwd()
): Promise<GetMeshOptions> {
  const explorer = cosmiconfig(name);
  const results = await explorer.search(dir);
  const config = results?.config as YamlConfig.Config;

  const sources = await Promise.all(
    config.sources.map(async source => {
      const transformations: Transformation[] = await Promise.all(
        (source.transformations || []).map(async t => {
          return {
            config: t,
            transformer: await getPackage<TransformFn>(t.type, 'transform')
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

  const transformations: Transformation[] = await Promise.all(
    (config.transformations || []).map(async t => {
      return {
        config: t,
        transformer: await getPackage<TransformFn>(t.type, 'transform')
      };
    })
  );

  const additionalResolvers = await resolveAdditionalResolvers(
    dir,
    config.additionalResolvers || []
  );

  return {
    sources,
    transformations,
    additionalResolvers
  };
}
