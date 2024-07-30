/* eslint-disable */
const { build } = require('esbuild');
const { copyFileSync } = require('fs');
const { join } = require('path');

async function main() {
  await build({
    entryPoints: ['./index.ts'],
    outfile: 'bundle.js',
    format: 'cjs',
    minify: false,
    bundle: true,
    platform: 'node',
    target: 'es2023',
    alias: {
      'lru-cache': join(__dirname, '../../../../node_modules/lru-cache/dist/commonjs/index.js'),
    },
  });

  copyFileSync(join(__dirname, '../src/typeDefs.graphql'), join(__dirname, '../typeDefs.graphql'));

  console.info(`Apollo Subgraph test build done!`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
