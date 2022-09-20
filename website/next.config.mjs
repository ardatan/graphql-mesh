import { withGuildDocs } from 'guild-docs/next.config';
import { applyUnderscoreRedirects } from 'guild-docs/underscore-redirects';

export default withGuildDocs({
  basePath: process.env.NEXT_BASE_PATH && process.env.NEXT_BASE_PATH !== '' ? process.env.NEXT_BASE_PATH : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack(config, meta) {
    applyUnderscoreRedirects(config, meta);

    return config;
  },
  redirects: () =>
    Object.entries({
      '/docs/introduction': '/docs',
      '/docs/getting-started': '/docs/getting-started/overview',
      '/docs/getting-started/introduction': '/docs/getting-started/overview',
      '/docs/getting-started/basic-example': '/docs',
      '/docs/handlers': '/docs/handlers/handlers-introduction',
      '/docs/handlers/available-handlers': '/docs/handlers/handlers-introduction',
      '/docs/api/modules/runtime_src': '/docs/getting-started/your-first-mesh-gateway',
      '/docs/recipes': '/docs',
      '/docs/api': '/docs',
      '/docs/modules': '/docs',
      '/docs/api/modules': '/docs',
      '/docs/api/classes': '/docs',
    }).map(([from, to]) => ({
      source: from,
      destination: to,
      permanent: true,
    })),
});
