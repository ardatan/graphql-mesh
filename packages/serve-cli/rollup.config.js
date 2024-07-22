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
  'node_modules/graphql/index': '../../node_modules/graphql/index.mjs',
  // default transports should be in the container
  'node_modules/@graphql-mesh/transport-common/index': '../transports/common/src/index.ts',
  'node_modules/@graphql-mesh/transport-http/index': '../transports/http/src/index.ts',
  // extras for docker only
  'node_modules/@graphql-mesh/plugin-prometheus/index': '../plugins/prometheus/src/index.ts',
  'node_modules/@graphql-mesh/plugin-http-cache/index': '../plugins/http-cache/src/index.ts',
};

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
  external: ['uWebSockets.js', 'node-libcurl'],
  plugins: [
    tsConfigPaths(), // use tsconfig paths to resolve modules
    nodeResolve({ preferBuiltins: true }), // resolve node_modules and bundle them too
    commonjs(), // convert commonjs to esm
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
      for (const bundle of Object.values(bundles).filter(bundle => !!deps[bundle.name])) {
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
