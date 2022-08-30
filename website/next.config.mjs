import { withGuildDocs } from 'guild-docs/next.config';

export default withGuildDocs({
  basePath: process.env.NEXT_BASE_PATH && process.env.NEXT_BASE_PATH !== '' ? process.env.NEXT_BASE_PATH : undefined,
  experimental: {
    images: {
        unoptimized: true, // doesn't work with `next export`
        allowFutureImage: true,
      },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  redirects: () =>
  Object.entries({
    '/docs/introduction': '/docs',
    '/docs/recipes/build-mesh-artifacts': '/docs/guides/mesh-sdk',
  })
    .map(([from, to]) => ({
      source: from,
      destination: to,
      permanent: true,
    })),
});
