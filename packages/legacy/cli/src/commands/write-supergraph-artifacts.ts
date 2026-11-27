import type { GraphQLSchema } from 'graphql';
import type { Logger } from '@graphql-hive/logger';
import { path as pathModule } from '@graphql-mesh/cross-helpers';
import { writeFile } from '@graphql-mesh/utils';

/**
 * When underthehood compose succeeded, `schema.extensions.supergraphSdl` holds the
 * join-style SDL (sources → subgraphs like Mesh v2). Write under-the-hood artifacts
 * next to the client `schema.graphql`.
 *
 * Canonical module: `supergraph.graphql.ts` — default-export SDL as a GraphQL
 * template literal only (no `createBuiltHiveGateway` / named `supergraphSdl` surface).
 * HTTP stays `createMeshHTTPHandler` / `createBuiltMeshHTTPHandler` (Gateway under
 * the hood when the Mesh schema carries this SDL). Plain `supergraph.graphql` is
 * also written.
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
    `export default /* GraphQL */ \`${escapeForGraphQLTemplateLiteral(supergraphSdl)}\`;\n`;

  await Promise.all([
    writeFile(graphqlPath, supergraphSdl),
    writeFile(graphqlTsPath, graphqlTsContents),
  ]);

  opts.log.info(`Under-the-hood supergraph written to ${graphqlTsPath}`);
  return graphqlPath;
}

/** Escape SDL for embedding in a GraphQL-tagged template literal. */
function escapeForGraphQLTemplateLiteral(sdl: string): string {
  return sdl.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}
