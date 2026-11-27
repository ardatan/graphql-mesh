import type { GraphQLSchema } from 'graphql';
import type { Logger } from '@graphql-hive/logger';
import { path as pathModule } from '@graphql-mesh/cross-helpers';
import { writeFile } from '@graphql-mesh/utils';

/**
 * When underthehood compose succeeded, `schema.extensions.supergraphSdl` holds the
 * join-style SDL. Write it next to the client `schema.graphql` so `mesh start` /
 * `mesh dev` can feed Hive Gateway, and so consumers can run `hive-gateway` manually.
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
  const tsPath = pathModule.join(opts.outputDir, 'supergraph.ts');

  await Promise.all([
    writeFile(graphqlPath, supergraphSdl),
    writeFile(
      tsPath,
      `/* This file was automatically generated. DO NOT UPDATE MANUALLY. */\n` +
        `export const supergraphSdl = ${JSON.stringify(supergraphSdl)};\n` +
        `export default supergraphSdl;\n`,
    ),
  ]);

  opts.log.info(`Under-the-hood supergraph written to ${graphqlPath}`);
  return graphqlPath;
}
