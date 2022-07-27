import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexToAlgolia } from '@guild-docs/algolia';

const __dirname = dirname(fileURLToPath(import.meta.url));

indexToAlgolia({
  nextra: {
    docsBaseDir: resolve(__dirname, '../src/pages/'),
  },
  source: 'Mesh',
  dryMode: process.env.ALGOLIA_DRY_RUN === 'true',
  domain: process.env.SITE_URL,
  lockfilePath: resolve(__dirname, '../algolia-lockfile.json'),
});
