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
    '@parcel/watcher',
    /node_modules\/graphql/, // will be packed as dep
    /node_modules\\graphql/, // will be packed as dep
  ],
  plugins: [
    nodeResolve({ preferBuiltins: true }), // resolve node_modules and bundle them too
    packDeps(),
  ],
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
  const graphqlPath = path.join('..', '..', 'node_modules', 'graphql');
  zip.addLocalFolder(graphqlPath, './graphql'); // graphql is zero-dep
  zip.addLocalFolder('bundle/node_modules');
  const zipBuf = zip.toBuffer();
  const nodeVersionBuf = Buffer.from(process.version);
  const fullBuf = Buffer.concat([nodeVersionBuf, zipBuf]);
  const __MODULES_HASH__ = createHash('sha256').update(fullBuf).digest('hex');

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
      const admZipPath = path.join('..', '..', 'node_modules', 'adm-zip', 'adm-zip.js');
      const bundle = await rollup({
        input: admZipPath,
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

      // replace the @graphql-mesh/include/hooks register to use the absolute path of the packed deps
      const includeHooksRegisterDest = /register\(\s*'@graphql-mesh\/include\/hooks'/g; // intentionally no closing bracked because there's more arguments
      if (includeHooksRegisterDest.test(code)) {
        code = code.replaceAll(
          includeHooksRegisterDest,
          `register(require('node:url').pathToFileURL(require('node:path').join(globalThis.__PACKED_DEPS_PATH__, '@graphql-mesh', 'include', 'hooks.mjs'))`,
        );
      } else {
        throw new Error(
          `Include hooks path cannot be fixed, does "${includeHooksRegisterDest}" exist in the source code?`,
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
