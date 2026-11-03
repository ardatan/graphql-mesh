import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const here = dirname(fileURLToPath(import.meta.url));
const yargsRoot = dirname(require.resolve('yargs/package.json'));

const common = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  banner: {
    js: "const import_meta_url = require('url').pathToFileURL(__filename).href;",
  },
  define: {
    'import.meta.url': 'import_meta_url',
  },
};

await Promise.all([
  esbuild.build({
    ...common,
    entryPoints: [join(yargsRoot, 'index.mjs')],
    outfile: join(here, 'yargs-bundle.cjs'),
  }),
  esbuild.build({
    ...common,
    entryPoints: [join(yargsRoot, 'helpers', 'helpers.mjs')],
    outfile: join(here, 'yargs-helpers-bundle.cjs'),
  }),
]);

console.log('Bundled yargs for Jest into scripts/jest/');
