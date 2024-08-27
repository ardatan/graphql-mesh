import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const output = 'bundle/mesh-serve.cjs';
console.log(`Bundling binary to ${output}...`);

export default defineConfig({
  input: 'bundle/dist/bin.mjs',
  output: {
    file: output,
    format: 'cjs',
    inlineDynamicImports: true,
  },
  external: ['uWebSockets.js', '@parcel/watcher'],
  plugins: [nodeResolve(), isomorphicGraphql(), installUws()],
});

/**
 * Bundles all "graphql*" imports inline as an IIFE that first checks
 * whether the module is already available in near node_modules and uses it,
 * otherwise uses the bundled version.
 *
 * Essentially:
 * ```js
 * const graphql = require('graphql')
 * ```
 * becomes SEA safe version of:
 * ```js
 * const graphql = (function(){
 *   try {
 *     return require('graphql')
 *   } catch {
 *     return `<bundled require('graphql')>`
 *   }
 * })();
 * ```
 *
 * @type {import('rollup').PluginImpl}
 */
function isomorphicGraphql() {
  return {
    name: 'isomorphicGraphql',
    async resolveId(source) {
      // all graphql imports are marked as external and bundled in the renderChunk step
      if (source === 'graphql') {
        return { id: source, external: true };
      }
      if (source.startsWith('graphql/')) {
        return { id: source, external: true };
      }
    },
    async renderChunk(code) {
      if (!code.includes("require('graphql")) {
        // code doesnt include a "graphql*" require
        return null;
      }

      // append the SEA safe require on the bottom to not mess with the top definitions like 'use strict' and the hashbang
      let augmented = code;
      for (const [match, path] of augmented.matchAll(/require\('(graphql.*)'\)/g)) {
        const requirePath = `../../node_modules/${path === 'graphql' ? 'graphql/index.mjs' : path.replace(/\.js$/, '.mjs')}`;

        const bundle = await rollup({ input: requirePath, plugins: [nodeResolve()] });
        const { output } = await bundle.generate({ format: 'cjs', inlineDynamicImports: true });
        let code = `/* require('${path}') */(function(){
try {
  // Node SEA safe require implementation that's used for optionally requiring modules
  // available in the nearby node_modules, falling back to the bundled version.
  // TODO: wasteful, use a singleton sea safe require instead. but it's not all that bad since this is done just once
  return require('node:module').createRequire(__filename)('${path}');
} catch(e) {
  const exports = {};
  ${output[0].code}
  return exports;
}
})()`;
        await bundle.close();

        augmented = augmented.replace(match, () => code);
      }
      return augmented;
    },
  };
}

/**
 * Copies the uWebSockets.js node addon for the current platform, installs
 * it and prepares for building the single binary.
 *
 * @type {import('rollup').PluginImpl}
 */
function installUws() {
  const { platform, arch, versions } = process;

  const assetName = 'uws.node'; // must match sea-config.json
  const destPath = `bundle/${assetName}`;

  const addonName = `uws_${platform}_${arch}_${versions.modules}.node`;
  const addonPath = path.resolve(`../../node_modules/uWebSockets.js/${addonName}`);

  return {
    name: 'installUws',
    generateBundle() {
      if (!fs.existsSync(addonPath)) {
        throw new Error(`UWS addon does not exist at ${addonPath}`);
      }
      fs.copyFileSync(addonPath, destPath);
    },
    renderChunk(code) {
      const uwsImportLocation = `import('uWebSockets.js')`;
      if (!code.includes(uwsImportLocation)) {
        throw new Error('Cannot find destination in bundle to inject uws addon');
      }

      const uwsInjection = `(function(){
        const { getAsset } = require('node:sea');
        const { createRequire } = require('node:module');
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const crypto = require('crypto');

        // Create a temporary file
        function tmpFileSync(postfix) {
          const tmpDir = os.tmpdir();
          const name = [
            'tmp-',
            process.pid,
            '-',
            Math.random().toString('32').slice(2),
            postfix ? '-' + postfix : ''
          ].join('');

          const filePath = path.join(tmpDir, name);
          fs.writeFileSync(filePath, '');

          return filePath;
        }

        const assetName = ${JSON.stringify(assetName)};
        const assetData = getAsset(assetName);

        const bufferData = Buffer.from(assetData);

        // Create a temporary file in the system's temp directory
        const tempFilePath = tmpFileSync(assetName);
        fs.writeFileSync(tempFilePath, bufferData);

        const requireTemp = createRequire(tempFilePath);
        return Promise.resolve(requireTemp(tempFilePath));
      })()`;

      return code.replaceAll(uwsImportLocation, uwsInjection)
    },
  };
}
