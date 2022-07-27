import nextBundleAnalyzer from '@next/bundle-analyzer';
import nextra from 'nextra';

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  unstable_staticImage: true,
});

const withBundleAnalyzer = nextBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

export default withBundleAnalyzer(
  withNextra({
    eslint: {
      ignoreDuringBuilds: true,
    },
    redirects: () => [
      {
        source: '/docs/introduction',
        destination: '/docs',
        permanent: true,
      },
    ],
  })
);
