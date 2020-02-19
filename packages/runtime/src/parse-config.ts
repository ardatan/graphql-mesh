import { MeshConfig } from './config';
import { cosmiconfig } from 'cosmiconfig';
import { GetMeshOptions } from './types';
import { getHandler } from './utils';

export async function parseConfig(name = 'mesh', dir = process.cwd()): Promise<GetMeshOptions> {
  const explorer = cosmiconfig(name);
  const results = await explorer.search(dir);
  const config = results?.config as MeshConfig;
  const sources = await Promise.all(
    config.sources.map(async source => ({
      name: source.name,
      handler: await getHandler(source.handler.name),
      config: source.handler.config,
      source: source.source
    }))
  );

  return {
    sources
  };
}
