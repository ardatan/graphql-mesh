import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ADMZip from 'adm-zip';
import { defineConfig, rollup } from 'rollup';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const seaConfig = JSON.parse(fs.readFileSync('sea-config.json', 'utf8'));

console.log(`Bundling binary to ${seaConfig.main}...`);

export default defineConfig({
  input: 'bundle/dist/bin.mjs',
  output: {
    file: seaConfig.main,
    format: 'cjs',
    inlineDynamicImports: true,
  },
  external: [
    'node-libcurl',
    '@parcel/watcher',
    'uWebSockets.js', // will be installed
    /node_modules\/graphql/, // will be packed as dep
  ],
  plugins: [
    nodeResolve(),
    //isomorphicGraphql(),
    installUws(),
    installDeps(),
  ],
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
  const assetName = 'uws.node';
  const destPath = seaConfig.assets[assetName];
  if (!destPath) {
    throw new Error(`Asset "${assetName}" not defined in sea-config.json`);
  }

  const { platform, arch, versions } = process;
  const addonName = `uws_${platform}_${arch}_${versions.modules}.node`;
  const addonPath = path.resolve(`../../node_modules/uWebSockets.js/${addonName}`);

  return {
    name: 'installUws',
    generateBundle() {
      if (!fs.existsSync(addonPath)) {
        throw new Error(`UWS addon does not exist at ${addonPath}`);
      }
      this.emitFile({
        type: 'asset',
        fileName: assetName,
        source: fs.readFileSync(addonPath),
      });
    },
    renderChunk(code, chunk) {
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

      return code.replaceAll(uwsImportLocation, uwsInjection);
    },
  };
}

/**
 * @type {import('rollup').PluginImpl}
 */
function installDeps() {
  const assetName = 'node_modules.zip';
  const destPath = seaConfig.assets[assetName];
  if (!destPath) {
    throw new Error(`Asset "${assetName}" not defined in sea-config.json`);
  }

  const zip = new ADMZip();
  zip.addLocalFolder('../../node_modules/graphql', './graphql');
  zip.addLocalFolder('bundle/node_modules');
  const zipBuf = zip.toBuffer();
  const __MODULES_HASH__ = createHash('sha256').update(zipBuf).digest('hex');

  return {
    name: 'installDeps',
    async renderChunk(code) {
      // inject the sea packed deps install script on the second line, skipping the hashbang and 'use strict' declaration
      const [hashbang, usestrict, ...rest] = code.split('\n');
      code = [
        hashbang,
        usestrict,
        fs.readFileSync('scripts/install-sea-packed-deps.cjs', 'utf8'),
        ...rest,
      ].join('\n');

      // bundle adm-zip and inject it to the script
      const bundle = await rollup({
        input: '../../node_modules/adm-zip/adm-zip.js',
        plugins: [nodeResolve(), commonjs(), json()],
      });
      const { output: outputs } = await bundle.generate({
        format: 'cjs',
        inlineDynamicImports: true,
      });
      code = code.replace(
        "require('adm-zip')",
        () => `/* require('adm-zip') */(function(){
const module = {};
${outputs[0].code}
return module.exports;
})()`,
      );
      await bundle.close();

      // inject the modules hash
      code = code.replaceAll('__MODULES_HASH__', JSON.stringify(__MODULES_HASH__));

      // replace all "graphql*" requires to use the to the packed deps
      for (const [match, path] of code.matchAll(/require\('(graphql.*)'\)/g)) {
        code = code.replace(match, () => `seaPackedModulesRequire(${JSON.stringify(path)})`);
      }

      return code;
    },
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: assetName,
        source: zipBuf,
      });
    },
  };
}
