import { withGuildDocs } from 'guild-docs/next.config';

export default withGuildDocs({
  eslint: {
    ignoreDuringBuilds: true,
  },
  redirects: () => [
    {
      source: '/docs/introduction',
      destination: '/docs',
      permanent: true,
    },
    {
      source: '/docs/recipes/build-mesh-artifacts',
      destination: '/docs/guides/mesh-sdk',
    },
  ],
});
