/* eslint sort-keys: error */
import { withGuildDocs } from '@theguild/components/next.config';

export default withGuildDocs({
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  nextraConfig: {
    autoImportThemeStyle: false,
  },
  redirects: () =>
    Object.entries({
      '/api': '/docs',
      '/api/enums/store_src.PredefinedProxyOptionsName':
        '/docs/getting-started/customize-mesh-server',
      '/docs/api/classes/:path*': '/docs',
      '/docs/api/interfaces/:path*': '/docs',
      '/docs/api/modules/:path*': '/docs',
      '/docs/cache': '/docs/cache/cache-introduction',
      '/docs/getting-started': '/docs/getting-started/overview',
      '/docs/getting-started/basic-example': '/docs/getting-started/your-first-mesh-gateway',
      '/docs/getting-started/combine-many-sources':
        '/docs/getting-started/combine-multiple-sources',
      '/docs/getting-started/introduction': '/docs/getting-started/overview',
      '/docs/getting-started/mesh-transforms': '/docs/transforms/transforms-introduction',
      '/docs/getting-started/multiple-apis': '/docs/getting-started/combine-multiple-sources',
      '/docs/guides': '/docs/guides/extending-unified-schema',
      '/docs/guides/combine-many-sources': '/docs/getting-started/combine-multiple-sources',
      '/docs/guides/error-handling': '/docs/guides/error-masking',
      '/docs/guides/live-queries': '/docs/plugins/live-queries',
      '/docs/guides/performances-best-practices': '/docs/guides/batching',
      '/docs/handlers': '/docs/handlers/handlers-introduction',
      '/docs/handlers/available-handlers': '/docs/handlers/handlers-introduction',
      '/docs/introduction': '/docs',
      '/docs/migration': '/docs/migration/openapi-0.31-0.32',
      '/docs/migration/openapi-0': '/docs/migration/openapi-0.31-0.32',
      '/docs/modules/:path*': '/docs',
      '/docs/plugins': '/docs/plugins/plugins-introduction',
      '/docs/recipes/:path*': '/docs',
      '/docs/subscriptions-webhooks.md': '/docs/guides/subscriptions-webhooks',
      '/docs/transforms': '/docs/transforms/transforms-introduction',
      '/docs/transforms/cache': '/docs/cache/cache-introduction',
      '/docs/transforms/mock': '/docs/plugins/mock',
      '/openapi': '/docs/handlers/openapi',
      '/v1/serve': 'https://the-guild.dev/graphql/hive/docs/gateway',
      '/v1/serve/:path*': 'https://the-guild.dev/graphql/hive/docs/gateway/:path*',
      '/v1/introduction': '/v1',
    }).map(([from, to]) => ({
      destination: to,
      permanent: true,
      source: from,
    })),
});
