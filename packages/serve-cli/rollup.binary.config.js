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

  const addonName = `uws_${platform}_${arch}_${versions.modules}.node`;
  const srcPath = path.resolve(`../../node_modules/uWebSockets.js/${addonName}`);
  const destPath = `bundle/${addonName}`;

  return {
    name: 'installUws',
    generateBundle() {
      console.log(`Current working directory: ${process.cwd()}`);
      console.log(`Looking for binary at: ${srcPath}`);

      const bundleDir = path.dirname(destPath);
      if (!fs.existsSync(bundleDir)) {
        console.log(`Creating directory: ${bundleDir}`);
        fs.mkdirSync(bundleDir, { recursive: true });
      }

      if (fs.existsSync(srcPath)) {
        try {
          console.log(`Copying ${addonName} to ${destPath}`);
          fs.copyFileSync(srcPath, destPath);
          console.log(`Successfully copied ${addonName}`);

          // Update sea-config.json with the correct asset
          const seaConfigPath = path.resolve('./sea-config.json');
          let seaConfig = {
            main: output,
            output: 'sea-prep.blob',
            disableExperimentalSEAWarning: true,
            assets: {},
          };

          // Update the assets object
          seaConfig.assets[addonName] = destPath;

          // Write the updated config back to sea-config.json
          fs.writeFileSync(seaConfigPath, JSON.stringify(seaConfig, null, 2), 'utf-8');
          console.log(`Updated sea-config.json with asset ${addonName}`);
        } catch (error) {
          console.error(`Failed to copy ${addonName}: ${error.message}`);
        }
      } else {
        console.warn(
          `Native binary ${addonName} not found at ${srcPath}. Please ensure it exists.`,
        );
      }
    },
    writeBundle() {
      const bundleFilePath = path.resolve(output);

      // unique replacement location
      const oldContent = `import('uWebSockets.js')`;

      // TODO: not type safe
      const newContent = `(function(){
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

  const assetName = 'uws_' + process.platform + '_' + process.arch + '_' + process.versions.modules + '.node';
  const assetData = getAsset(assetName);

  const bufferData = Buffer.from(assetData);

  // Create a temporary file in the system's temp directory
  const tempFilePath = tmpFileSync(assetName);
  fs.writeFileSync(tempFilePath, bufferData);

  const requireTemp = createRequire(tempFilePath);
  return Promise.resolve(requireTemp(tempFilePath));
})()`;

      // Read the bundle file and replace the specified content
      let bundleContent = fs.readFileSync(bundleFilePath, 'utf-8');
      if (!bundleContent.includes(oldContent)) {
        throw new Error('Cannot find destination in bundle to inject uws addon');
      }
      bundleContent = bundleContent.replaceAll(oldContent, newContent);

      // Write the modified content back to the bundle file
      fs.writeFileSync(bundleFilePath, bundleContent, 'utf-8');
      console.log(`Replaced uws$1.exports block in ${bundleFilePath}`);
    },
  };
}
