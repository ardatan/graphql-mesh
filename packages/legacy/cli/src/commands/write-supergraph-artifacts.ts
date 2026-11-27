import type { GraphQLSchema } from 'graphql';
import type { Logger } from '@graphql-hive/logger';
import { path as pathModule } from '@graphql-mesh/cross-helpers';
import { writeFile } from '@graphql-mesh/utils';

/**
 * When underthehood compose succeeded, `schema.extensions.supergraphSdl` holds the
 * join-style SDL. Write under-the-hood artifacts next to the client `schema.graphql`
 * so `mesh start` / `mesh dev` can feed Hive Gateway.
 *
 * Canonical module artifact: `supergraph.graphql.ts`.
 * Plain `supergraph.graphql` is also written so Gateway / `hive-gateway` can take a path.
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

  await Promise.all([
    writeFile(graphqlPath, supergraphSdl),
    writeFile(
      graphqlTsPath,
      `/* This file was automatically generated. DO NOT UPDATE MANUALLY. */\n` +
        `export const supergraphSdl = ${JSON.stringify(supergraphSdl)};\n` +
        `export default supergraphSdl;\n`,
    ),
  ]);

  opts.log.info(`Under-the-hood supergraph written to ${graphqlTsPath}`);
  return graphqlPath;
}
