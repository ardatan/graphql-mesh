module.exports = {
  title: 'GraphQL Mesh',
  tagline: 'Query anything, run anywhere',
  url: 'https://graphql-mesh.com',
  baseUrl: '/',
  baseUrlIssueBanner: false,
  favicon: 'img/favicon.ico',
  organizationName: 'urigo',
  projectName: 'graphql-mesh',
  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
    },
    algolia: {
      appId: 'ANRJKXZTRW',
      apiKey: '811d453fc7f80306044dd5cc4b87e064',
      indexName: 'theguild',
      algoliaOptions: {},
    },
    navbar: {
      title: 'GraphQL Mesh',
      logo: {
        alt: 'GraphQL Mesh',
        src: 'img/mesh-logo.svg',
      },
      items: [
        {
          to: 'docs/getting-started/introduction',
          activeBasePath: 'docs',
          label: 'API & Documentation',
          position: 'right',
        },
        {
          href: 'https://github.com/urigo/graphql-mesh',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://the-guild.dev/contact',
          label: 'Contact Us',
          position: 'right',
        },
      ],
    },
    footer: {
      links: [
        /* {
          title: 'Docs',
          items: [
            {
              label: 'Style Guide',
              to: 'docs/doc1'
            },
            {
              label: 'Second Doc',
              to: 'docs/doc2'
            }
          ]
        }, */
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'http://bit.ly/guild-chat',
            },
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/graphql-mesh',
            },
          ],
        },
        {
          title: 'Social',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/Urigo/graphql-mesh/',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/TheGuildDev',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} GraphQL Mesh, The Guild, Inc. Built with Docusaurus.`,
    },
  },
  scripts: [
    {
      src: 'https://the-guild.dev/static/banner.js',
      // we may want to load it ASAP
      async: true,
    },
  ],
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          remarkPlugins: [require('remark-code-import'), require('remark-import-partial')],
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/urigo/graphql-mesh/edit/master/website/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
};
