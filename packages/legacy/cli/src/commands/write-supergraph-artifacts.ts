import type { GraphQLSchema } from 'graphql';
import type { Logger } from '@graphql-hive/logger';
import { path as pathModule } from '@graphql-mesh/cross-helpers';
import { writeFile } from '@graphql-mesh/utils';

/**
 * Specifier for the loadable supergraph module in generated Mesh artifacts.
 * Must not be `./supergraph.graphql` — that path resolves to the plain SDL file
 * and fails under jiti/Node. Prefer `.js` so TS artifacts and compiled JS/CJS
 * emit paths all resolve the same loadable module.
 */
export const SUPERGRAPH_MODULE_IMPORT = `import supergraph from './supergraph.graphql.js';`;

/**
 * When underthehood compose succeeded, `schema.extensions.supergraphSdl` holds the
 * join-style SDL (sources → subgraphs like Mesh v2). Write under-the-hood artifacts
 * next to the client `schema.graphql`.
 *
 * Canonical loadable modules: `supergraph.graphql.ts` + `supergraph.graphql.js` —
 * default-export SDL as a GraphQL template literal only (no `createBuiltHiveGateway`
 * / named `supergraphSdl` surface). Generated `index` imports `./supergraph.graphql.js`
 * so the plain `supergraph.graphql` SDL dump cannot shadow the module. HTTP stays
 * `createMeshHTTPHandler` / `createBuiltMeshHTTPHandler` (Gateway under the hood when
 * the Mesh schema carries this SDL).
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
  const graphqlJsPath = pathModule.join(opts.outputDir, 'supergraph.graphql.js');

  const moduleContents =
    `/* This file was automatically generated. DO NOT UPDATE MANUALLY. */\n` +
    `export default /* GraphQL */ \`${escapeForGraphQLTemplateLiteral(supergraphSdl)}\`;\n`;

  await Promise.all([
    writeFile(graphqlPath, supergraphSdl),
    writeFile(graphqlTsPath, moduleContents),
    // Always emit a loadable JS companion so `./supergraph.graphql.js` resolves on
    // every artifact emit path (fileType ts keeps sources; js/json compiles index).
    writeFile(graphqlJsPath, moduleContents),
  ]);

  opts.log.info(`Under-the-hood supergraph written to ${graphqlTsPath}`);
  return graphqlPath;
}

/** Escape SDL for embedding in a GraphQL-tagged template literal. */
function escapeForGraphQLTemplateLiteral(sdl: string): string {
  return sdl.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}
