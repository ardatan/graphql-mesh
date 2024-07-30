/* eslint-disable */
const { build } = require('esbuild');

async function main() {
  await build({
    entryPoints: ['./gateway.ts'],
    outfile: 'gateway.js',
    format: 'cjs',
    minify: false,
    bundle: true,
    platform: 'node',
    target: 'es2020',
  });

  console.info(`Apollo Subgraph test build done!`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
