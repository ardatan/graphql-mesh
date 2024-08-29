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
  plugins: [nodeResolve(), packDeps()],
});

/**
 * @type {import('rollup').PluginImpl}
 */
function packDeps() {
  const assetName = 'node_modules.zip';
  const destPath = seaConfig.assets[assetName];
  if (!destPath) {
    throw new Error(`Asset "${assetName}" not defined in sea-config.json`);
  }

  const zip = new ADMZip();
  let uwsAddonAdded = false;
  const uwsAddonForThisSystem = `uws_${process.platform}_${process.arch}_${process.versions.modules}.node`;
  zip.addLocalFolder('../../node_modules/uWebSockets.js', './uWebSockets.js', filename => {
    filename = filename.replace('uWebSockets.js/', '');
    if (filename === uwsAddonForThisSystem) uwsAddonAdded = true;
    return [
      uwsAddonForThisSystem,
      'package.json',
      'uws.js', // cjs
      'ESM_wrapper.mjs', // esm
      'index.d.ts', // types (unused, but why not)
    ].includes(filename);
  });
  if (!uwsAddonAdded) {
    throw new Error(
      `uWebSockets.js doesnt have the "${uwsAddonForThisSystem}" addon for this system`,
    );
  }
  zip.addLocalFolder('../../node_modules/graphql', './graphql'); // works just like this because graphql is zero-dep
  zip.addLocalFolder('bundle/node_modules');
  const zipBuf = zip.toBuffer();
  const __MODULES_HASH__ = createHash('sha256').update(zipBuf).digest('hex');

  return {
    name: 'packDeps',
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

      // replace all "graphql*" requires to use the packed deps (the new require will invoke @graphql-mesh/include/hooks)
      for (const [match, path] of code.matchAll(/require\('(graphql.*)'\)/g)) {
        code = code.replace(
          match,
          () => `require('node:module').createRequire(__filename)(${JSON.stringify(path)})`,
        );
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
