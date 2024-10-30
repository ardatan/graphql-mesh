import type { Logger, YamlConfig } from '@graphql-mesh/types';
import { GrpcLoaderHelper } from './grpcLoaderHelper.js';

interface LoaderContext {
  cwd: string;
  logger: Logger;
}

export function loadGrpcSubgraph(name: string, options: YamlConfig.GrpcHandler) {
  return (ctx: LoaderContext) => ({
    name,
    schema$: new GrpcLoaderHelper(name, ctx.cwd, ctx.logger, options).buildSchema(),
  });
}
