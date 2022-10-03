import { withGuildDocs } from '@theguild/components/next.config';

export default withGuildDocs({
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  redirects: () =>
    Object.entries({
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
    }).map(([from, to]) => ({
      source: from,
      destination: to,
      permanent: true,
    })),
});
