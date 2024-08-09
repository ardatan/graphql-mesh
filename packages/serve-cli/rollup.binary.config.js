import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'rollup';
import tsConfigPaths from 'rollup-plugin-tsconfig-paths';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import sucrase from '@rollup/plugin-sucrase';

const platform = process.platform;
const arch = process.arch;
const modulesVersion = process.versions.modules;

const binaryName = `uws_${platform}_${arch}_${modulesVersion}.node`;
const binarySourcePath = path.resolve(`../../node_modules/uWebSockets.js/${binaryName}`);
const binaryDestPath = `./bundle/${binaryName}`;

export default defineConfig({
  input: 'src/bin.ts',
  output: {
    file: 'bundle/bin.cjs',
    format: 'cjs',
    inlineDynamicImports: true,
  },
  external: ['node-libcurl', '@parcel/watcher'],
  plugins: [
    tsConfigPaths(),
    nodeResolve({ preferBuiltins: true }),
    commonjs({
      dynamicRequireTargets: ['@parcel/watcher'],
      ignoreDynamicRequires: true,
    }),
    json(),
    sucrase({ transforms: ['typescript'] }),
    copyNativeBinary(),
    modifyBundle(), // Custom plugin to modify the bundle output
  ],
  preserveModules: false,
});

function copyNativeBinary() {
  return {
    name: 'copyNativeBinary',
    generateBundle() {
      console.log(`Current working directory: ${process.cwd()}`);
      console.log(`Looking for binary at: ${binarySourcePath}`);

      const bundleDir = path.dirname(binaryDestPath);
      if (!fs.existsSync(bundleDir)) {
        console.log(`Creating directory: ${bundleDir}`);
        fs.mkdirSync(bundleDir, { recursive: true });
      }

      if (fs.existsSync(binarySourcePath)) {
        try {
          console.log(`Copying ${binaryName} to ${binaryDestPath}`);
          fs.copyFileSync(binarySourcePath, binaryDestPath);
          console.log(`Successfully copied ${binaryName}`);

          // Update sea-config.json with the correct asset
          updateSeaConfig(binaryName, binaryDestPath);
        } catch (error) {
          console.error(`Failed to copy ${binaryName}: ${error.message}`);
        }
      } else {
        console.warn(
          `Native binary ${binaryName} not found at ${binarySourcePath}. Please ensure it exists.`,
        );
      }
    },
  };
}

function updateSeaConfig(assetName, assetPath) {
  const seaConfigPath = path.resolve('./sea-config.json');
  let seaConfig = {
    main: './bundle/bin.cjs',
    output: 'sea-prep.blob',
    disableExperimentalSEAWarning: true,
    assets: {},
  };

  // Update the assets object
  seaConfig.assets[assetName] = assetPath;

  // Write the updated config back to sea-config.json
  fs.writeFileSync(seaConfigPath, JSON.stringify(seaConfig, null, 2), 'utf-8');
  console.log(`Updated sea-config.json with asset ${assetName}`);
}

function modifyBundle() {
  return {
    name: 'modifyBundle',
    writeBundle() {
      const bundleFilePath = path.resolve('./bundle/bin.cjs');

      // Literal replacement
      const oldContent = `return require('./uws_' + process.platform + '_' + process.arch + '_' + process.versions.modules + '.node');`;

      const newContent = `
const { getAsset } = require('node:sea');
const { createRequire } = require('node:module');
const fs = require('fs');
const path = require('path');

    const assetName = 'uws_' + process.platform + '_' + process.arch + '_' + process.versions.modules + '.node';
    const assetData = getAsset(assetName);

    const bufferData = Buffer.from(assetData);

    const tempFilePath = path.join(__dirname, assetName);
    fs.writeFileSync(tempFilePath, bufferData);
    const requireTemp = createRequire(tempFilePath);
    return requireTemp(tempFilePath);`;

      // Read the bundle file and replace the specified content
      let bundleContent = fs.readFileSync(bundleFilePath, 'utf-8');
      bundleContent = bundleContent.replace(oldContent, newContent);

      // Write the modified content back to the bundle file
      fs.writeFileSync(bundleFilePath, bundleContent, 'utf-8');
      console.log(`Replaced uws$1.exports block in ${bundleFilePath}`);
    },
  };
}
