import path from 'node:path';
import { defineConfig } from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import sucrase from '@rollup/plugin-sucrase';

/**
 * Dependencies that need to be bundled and placed in the node_modules for usage by Mesh Config.
 *
 * Is a map of destination path to the source file to bundle.
 */
const deps = {
  'node_modules/@graphql-mesh/serve-cli/index': 'src/index.ts',
  'node_modules/@graphql-mesh/transport-http/index': '../transports/http/src/index.ts',
  // TODO: rest of deps
};

export default defineConfig({
  input: {
    bin: 'src/bin.ts',
    ...deps,
  },
  output: {
    dir: 'bundle',
    format: 'esm',
  },
  external: ['uWebSockets.js', 'node-libcurl'],
  plugins: [
    nodeResolve(), // resolve node_modules and bundle them too
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
      for (const bundle of Object.values(bundles)) {
        const dir = path.dirname(bundle.fileName);
        const bundledFile = path.basename(bundle.fileName);
        const pkg = { type: 'module', main: bundledFile };
        console.log(bundle.name);
        if (bundle.name === 'bin') {
          pkg.dependencies = {
            'uWebSockets.js': 'uNetworking/uWebSockets.js#semver:^20',
            // TODO: node-libcurl has issues with being built in the docker
          };
        }
        this.emitFile({
          type: 'asset',
          fileName: path.join(dir, 'package.json'),
          source: JSON.stringify(pkg),
        });
      }
    },
  };
}