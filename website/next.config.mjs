import { withGuildDocs } from '@theguild/components/next.config';

export default withGuildDocs({
  eslint: {
    ignoreDuringBuilds: true,
  },
  redirects: () =>
    Object.entries({
      '/api/enums/store_src.PredefinedProxyOptionsName': '/docs/getting-started/customize-mesh-server',
      '/api': '/docs',
      '/openapi': '/docs/handlers/openapi',
      '/docs/api/classes/:path*': '/docs',
      '/docs/api/interfaces/:path*': '/docs',
      '/docs/api/modules/:path*': '/docs',
      '/docs/modules/:path*': '/docs',
      '/docs/introduction': '/docs',
      '/docs/recipes/:path*': '/docs',
      '/docs/getting-started': '/docs/getting-started/overview',
      '/docs/getting-started/introduction': '/docs/getting-started/overview',
      '/docs/handlers': '/docs/handlers/handlers-introduction',
      '/docs/handlers/available-handlers': '/docs/handlers/handlers-introduction',
      '/docs/migration': '/docs/migration/openapi-0.31-0.32',
      '/docs/transforms': '/docs/transforms/transforms-introduction',
      '/docs/guides': '/docs/guides/extending-unified-schema',
      '/docs/plugins': '/docs/plugins/plugins-introduction',
      '/docs/getting-started/multiple-apis': '/docs/getting-started/combine-multiple-sources',
      '/docs/guides/combine-many-sources': '/docs/getting-started/combine-multiple-sources',
      '/docs/getting-started/combine-many-sources': '/docs/getting-started/combine-multiple-sources',
      '/docs/getting-started/basic-example': '/docs/getting-started/your-first-mesh-gateway',
      '/docs/subscriptions-webhooks.md': '/docs/guides/subscriptions-webhooks',
      '/docs/guides/error-handling': '/docs/guides/error-masking',
      '/docs/guides/live-queries': '/docs/plugins/live-queries',
      '/docs/migration/openapi-0': '/docs/migration/openapi-0.31-0.32',
      '/docs/cache': '/docs/transforms/cache',
      '/docs/guildes/extending-unified-schema': '/docs/guides/extending-unified-schema',
      '/docs/transforms/mock': '/docs/plugins/mock',
      '/docs/getting-started/mesh-transforms': '/docs/transforms/transforms-introduction',
    }).map(([from, to]) => ({
      source: from,
      destination: to,
      permanent: true,
    })),
});
