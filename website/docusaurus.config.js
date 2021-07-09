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
      disableSwitch: true,
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
  },
  scripts: ['https://the-guild.dev/static/crisp.js'],
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
