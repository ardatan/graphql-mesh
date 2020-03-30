module.exports = {
  title: 'GraphQL Mesh',
  tagline: 'Query anything, run anywhere',
  url: 'https://graphql-mesh.com',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'urigo', // Usually your GitHub org/user name.
  projectName: 'graphql-mesh', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: 'GraphQL Mesh',
      logo: {
        alt: 'GraphQL Mesh',
        src: 'img/mesh-logo.svg',
      },
      links: [
        {
          to: 'docs/getting-started/introduction',
          activeBasePath: 'docs',
          label: 'Docs & API Reference',
          position: 'left',
        },
        {to: 'blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/urigo/graphql-mesh',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://twitter.com/TheGuildDev',
          label: 'The Guild',
          position: 'right',
        },
      ],
    },
    footer: {
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Style Guide',
              to: 'docs/doc1',
            },
            {
              label: 'Second Doc',
              to: 'docs/doc2',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/docusaurus',
            },
            {
              label: 'Discord',
              href: 'https://discordapp.com/invite/docusaurus',
            },
          ],
        },
        {
          title: 'Social',
          items: [
            {
              label: 'Blog',
              to: 'blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/facebook/docusaurus',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/docusaurus',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} GraphQL Mesh, The Guild, Inc. Built with Docusaurus.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/urigo/graphql-mesh/edit/master/website/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
