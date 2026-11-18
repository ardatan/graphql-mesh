import { type Logger } from '@graphql-hive/logger';
import type { YamlConfig } from '@graphql-mesh/types';
import { GrpcLoaderHelper } from './grpcLoaderHelper.js';

interface LoaderContext {
  cwd: string;
  log: Logger;
}

export type ProtobufSourceType = 'grpc' | 'connect' | 'twirp';

export type ProtobufLoaderOptions = YamlConfig.GrpcHandler & {
  /**
   * RPC stack for emit/dial conventions. Same `.proto` parse for all.
   * Day one: `grpc`. Connect/Twirp loader emit can follow; hand SDL works now via HTTPS location.
   */
  type?: ProtobufSourceType;
};

/**
 * Load a protobuf-RPC subgraph from `.proto` / reflection.
 */
export function loadProtobufSubgraph(name: string, options: ProtobufLoaderOptions) {
  return (ctx: LoaderContext) => {
    const helper = new GrpcLoaderHelper(name, ctx.cwd, ctx.log, {
      ...options,
      // type reserved for future connect/twirp emit path conventions
    });
    const schema$ = helper.buildSchema().finally(() => helper.dispose());
    return {
      name,
      schema$,
    };
  };
}
