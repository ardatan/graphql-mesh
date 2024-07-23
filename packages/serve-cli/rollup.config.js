import path from 'node:path';
import { defineConfig } from 'rollup';
import tsConfigPaths from 'rollup-plugin-tsconfig-paths';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import sucrase from '@rollup/plugin-sucrase';

/**
 * Dependencies that need to be bundled and placed in the bundled node_modules. Modules that
 * are imported by the `mesh.config.ts` file need to exist here.
 *
 * Please note that the node_modules will not be in the WORKDIR of the docker image,
 * it will instead be one level up. This is because we want to keep the
 * bundled node_modules isolated from npm so that managing additional dependencies
 * wont have npm remove bundled ones.
 *
 * Needs to be used with the {@link packagejson} rollup plugin.
 *
 * Is a map of destination path to the source file to bundle.
 *
 * Include a plugin by adding to the {@link deps}:
 * ```json
 * {
 *   "node_modules/<package name>/index": "<relative path to main source file>"
 * }
 * ```
 *
 * For example, include the `@graphql-mesh/plugin-http-cache` plugin by adding:
 * ```json
 * {
 *   "node_modules/@graphql-mesh/plugin-http-cache/index": "../plugins/http-cache/src/index.ts"
 * }
 * ```
 */
const deps = {
  'node_modules/@graphql-mesh/serve-cli/index': 'src/index.ts',
  'node_modules/@graphql-mesh/compose-cli/index': '../compose-cli/src/types.ts', // we bundle compose types ONLY. adding support for configs with both serve and compose
  'node_modules/@graphql-mesh/serve-runtime/index': '../serve-runtime/src/index.ts',
  // default transports should be in the container
  'node_modules/@graphql-mesh/transport-common/index': '../transports/common/src/index.ts',
  'node_modules/@graphql-mesh/transport-http/index': '../transports/http/src/index.ts',
  // extras for docker only
  'node_modules/@graphql-mesh/plugin-prometheus/index': '../plugins/prometheus/src/index.ts',
  'node_modules/@graphql-mesh/plugin-http-cache/index': '../plugins/http-cache/src/index.ts',
};

if (process.env.E2E_SERVE_RUNNER === 'docker') {
  console.warn('⚠️ Bundling extra modules for e2e tests!');
  // extras specific to the docker serve runner in e2e tests
  deps['node_modules/@graphql-mesh/compose-cli/index'] = '../compose-cli/src/index.ts';
  deps['node_modules/@e2e/args/index'] = '../../e2e/utils/args.ts';
  deps['node_modules/@graphql-mesh/utils/index'] = '../legacy/utils/src/index.ts';
  deps['node_modules/@omnigraph/openapi/index'] = '../loaders/openapi/src/index.ts';
  deps['node_modules/@graphql-mesh/transport-ws/index'] = '../transports/ws/src/index.ts';
  deps['node_modules/@graphql-mesh/transport-http-callback/index'] =
    '../transports/http-callback/src/index.ts';
  deps['node_modules/@graphql-mesh/transport-rest/index'] = '../transports/rest/src/index.ts';
  deps['node_modules/@graphql-mesh/transport-soap/index'] = '../transports/soap/src/index.ts';
  deps['node_modules/@graphql-mesh/transport-mysql/index'] = '../transports/mysql/src/index.ts';
  deps['node_modules/@graphql-mesh/transport-neo4j/index'] = '../transports/neo4j/src/index.ts';
  deps['node_modules/@graphql-mesh/transport-sqlite/index'] = '../transports/sqlite/src/index.ts';
  deps['node_modules/@graphql-mesh/transport-thrift/index'] = '../transports/thrift/src/index.ts';
  deps['node_modules/@omnigraph/sqlite/index'] = '../loaders/sqlite/src/index.ts';
  deps['node_modules/@graphql-mesh/transport-sqlite/index'] = '../transports/sqlite/src/index.ts';
  deps['node_modules/@omnigraph/json-schema/index'] = '../loaders/json-schema/src/index.ts';
  deps['node_modules/@graphql-mesh/plugin-live-query/index'] = '../plugins/live-query/src/index.ts';
}

export default defineConfig({
  input: {
    'dist/bin': 'src/bin.ts',
    ...deps,
  },
  output: {
    dir: 'bundle',
    sourcemap: true,
    format: 'esm',
    // having an .mjs extension will make sure that node treats the files as ES modules always
    entryFileNames: '[name].mjs',
    // we want the chunks (common files) to be in the node_modules to avoid name
    // collisions with system files. the node_modules will be in the root of the
    // system (`/node_modules`)
    chunkFileNames: 'node_modules/.chunk/[name]-[hash].mjs',
  },
  external: [
    'uWebSockets.js',
    'node-libcurl',
    'tuql',
    'graphql',
    'graphql/execution/values.js', // because of https://github.com/n1ru4l/graphql-live-query/blob/beda6eb5a002e9d3b638af185f235951ed8f646d/packages/in-memory-live-query-store/src/extractLiveQueryRootFieldCoordinates.ts#L10
  ],
  plugins: [
    tsConfigPaths(), // use tsconfig paths to resolve modules
    nodeResolve({ preferBuiltins: true }), // resolve node_modules and bundle them too
    commonjs({
      esmExternals: [
        'graphql', // bundled dependency is an esm module
      ],
    }), // convert commonjs to esm
    json(), // support importing json files to esm (needed for commonjs() plugin)
    sucrase({ transforms: ['typescript'] }), // transpile typescript
    packagejson(), // add package jsons
  ],
});

/**
 * Adds package.json files to the bundle and its dependencies.
 *
 * @type {import('rollup').PluginImpl}
 */
function packagejson() {
  return {
    name: 'packagejson',
    generateBundle(_outputs, bundles) {
      for (const bundle of Object.values(bundles).filter(
        bundle => !!deps[bundle.name] && bundle.name.endsWith('/index'),
      )) {
        const dir = path.dirname(bundle.fileName);
        const bundledFile = path.basename(bundle.fileName);
        const pkg = { type: 'module', main: bundledFile };
        this.emitFile({
          type: 'asset',
          fileName: path.join(dir, 'package.json'),
          source: JSON.stringify(pkg),
        });
      }
    },
  };
}
