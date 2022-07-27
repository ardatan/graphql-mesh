import { withGuildDocs } from 'guild-docs/next.config';

export default withGuildDocs({
  redirects: () => [
    {
      source: '/docs/introduction',
      destination: '/docs',
      permanent: true,
    },
  ],
})
