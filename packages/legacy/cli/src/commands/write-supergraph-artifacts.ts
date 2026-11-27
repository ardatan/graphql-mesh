import type { GraphQLSchema } from 'graphql';
import type { Logger } from '@graphql-hive/logger';
import { path as pathModule } from '@graphql-mesh/cross-helpers';
import { writeFile } from '@graphql-mesh/utils';

/**
 * When underthehood compose succeeded, `schema.extensions.supergraphSdl` holds the
 * join-style SDL (sources → subgraphs like Mesh v2). Write under-the-hood artifacts
 * next to the client `schema.graphql`.
 *
 * Canonical module: `supergraph.graphql.ts` — SDL export plus programmatic Hive
 * Gateway factory that loads that Supergraph (standard Gateway transports from
 * `@transport` in the SG; no custom Mesh transport layer).
 *
 * Plain `supergraph.graphql` is also written so CLI / `hive-gateway` can take a path.
 */
export async function writeSupergraphArtifacts(opts: {
  outputDir: string;
  schema: GraphQLSchema;
  log: Logger;
}): Promise<string | undefined> {
  const supergraphSdl = (opts.schema.extensions as { supergraphSdl?: string } | undefined)
    ?.supergraphSdl;
  if (!supergraphSdl) {
    return undefined;
  }

  const graphqlPath = pathModule.join(opts.outputDir, 'supergraph.graphql');
  const graphqlTsPath = pathModule.join(opts.outputDir, 'supergraph.graphql.ts');

  const graphqlTsContents =
    `/* This file was automatically generated. DO NOT UPDATE MANUALLY. */\n` +
    `import { createGatewayRuntime, type GatewayConfigSupergraph } from '@graphql-hive/gateway-runtime';\n` +
    `\n` +
    `export const supergraphSdl = ${JSON.stringify(supergraphSdl)};\n` +
    `export default supergraphSdl;\n` +
    `\n` +
    `/**\n` +
    ` * Programmatic Hive Gateway for this under-the-hood supergraph.\n` +
    ` * Subgraph hops use standard Gateway transports resolved from \`@transport\`\n` +
    ` * in the Supergraph (same as Mesh v2 / Hive Gateway).\n` +
    ` */\n` +
    `export function createBuiltHiveGateway<\n` +
    `  TContext extends Record<string, any> = Record<string, any>,\n` +
    `>(config?: Omit<GatewayConfigSupergraph<TContext>, 'supergraph'>) {\n` +
    `  return createGatewayRuntime<TContext>({\n` +
    `    ...(config as GatewayConfigSupergraph<TContext>),\n` +
    `    supergraph: supergraphSdl,\n` +
    `  });\n` +
    `}\n`;

  await Promise.all([
    writeFile(graphqlPath, supergraphSdl),
    writeFile(graphqlTsPath, graphqlTsContents),
  ]);

  opts.log.info(`Under-the-hood supergraph written to ${graphqlTsPath}`);
  return graphqlPath;
}
