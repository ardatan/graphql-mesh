import { createRequire } from 'module';
import { withGuildDocs } from '@guild-docs/server';
import nextBundleAnalyzer from '@next/bundle-analyzer';
import { register } from 'esbuild-register/dist/node.js';
import { i18n } from './next-i18next.config.js';

const require = createRequire(import.meta.url);

register({ extensions: ['.ts', '.tsx'] });

const { getRoutes } = require('./routes.ts'); // with import got error Unknown file extension ".ts"

const withBundleAnalyzer = nextBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

export default withBundleAnalyzer(
  withGuildDocs({
    i18n,
    getRoutes,
    async redirects() {
      return [
        {
          source: '/docs',
          destination: '/docs/introduction',
          permanent: true,
        },
      ];
    },
  })
);
