const { withGuildDocs } = require('@guild-docs/server');
const { i18n } = require('./next-i18next.config');
const { register } = require('esbuild-register/dist/node');
register({ extensions: ['.ts', '.tsx'] });

const { getRoutes } = require('./routes.ts');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(
  withGuildDocs({
    i18n,
    getRoutes,
  }),
);
