module.exports = {
  title: 'GraphQL Mesh',
  tagline: 'Query anything, run anywhere',
  url: 'https://graphql-mesh.com',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'urigo',
  projectName: 'graphql-mesh',
  themeConfig: {
    defaultDarkMode: true,
    algolia: {
      apiKey: 'c028a32ff6167533a28b0c7e8bb250d9',
      indexName: 'graphql-mesh',
      algoliaOptions: {},
    },
    navbar: {
      title: 'GraphQL Mesh',
      logo: {
        alt: 'GraphQL Mesh',
        src: 'img/mesh-logo.svg'
      },
      links: [
        {
          to: 'docs/getting-started/introduction',
          activeBasePath: 'docs',
          label: 'API & Documentation',
          position: 'right'
        },
        {
          href: 'https://github.com/urigo/graphql-mesh',
          label: 'GitHub',
          position: 'right'
        },
        {
          href: 'https://the-guild.dev/contact',
          label: 'Contact Us',
          position: 'right'
        }
      ]
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
              href: 'http://bit.ly/guild-chat'
            },
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/graphql-mesh'
            }
          ]
        },
        {
          title: 'Social',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/Urigo/graphql-mesh/'
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/TheGuildDev'
            }
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} GraphQL Mesh, The Guild, Inc. Built with Docusaurus.`
    }
  },
  scripts: [
    {
      src: 'https://the-guild.dev/static/banner.js',
      // we may want to load it ASAP
      async: true,
      defer: true,
    }
  ],
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          remarkPlugins: [
            require('remark-code-import'),
            require('remark-import-partial')
          ],
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/urigo/graphql-mesh/edit/master/website/'
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      }
    ]
  ]
};
