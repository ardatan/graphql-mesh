import type { YamlConfig } from '@graphql-mesh/types';
import { GrpcLoaderHelper } from './grpcLoaderHelper.js';
import { Logger } from '@graphql-hive/logger';

interface LoaderContext {
  cwd: string;
  log: Logger;
}

export function loadGrpcSubgraph(name: string, options: YamlConfig.GrpcHandler) {
  return (ctx: LoaderContext) => {
    const helper = new GrpcLoaderHelper(name, ctx.cwd, ctx.log, options);
    const schema$ = helper.buildSchema().finally(() => helper.dispose());
    return {
      name,
      schema$,
    };
  };
}
