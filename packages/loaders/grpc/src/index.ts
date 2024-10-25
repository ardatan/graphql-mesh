import type { Logger, YamlConfig } from "@graphql-mesh/types";
import { gRPCLoader } from "./gRPCLoader";

interface LoaderContext {
  cwd: string;
  logger: Logger;
}

export function loadGrpcSubgraph(name: string, options: YamlConfig.GrpcHandler) {
  return (ctx: LoaderContext) => ({
    name,
    schema$: new gRPCLoader(name, ctx.cwd, ctx.logger, options).buildSchema(),
  });
}
