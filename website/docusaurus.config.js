module.exports = {
  title: 'GraphQL Mesh',
  tagline: 'Query anything, run anywhere',
  url: 'https://graphql-mesh.com',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'urigo',
  projectName: 'graphql-mesh',
  themeConfig: {
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
          label: 'Docs & API Reference',
          position: 'left'
        },
        {
          href: 'https://github.com/urigo/graphql-mesh',
          label: 'GitHub',
          position: 'right'
        },
        {
          href: 'https://twitter.com/TheGuildDev',
          label: 'The Guild',
          position: 'right'
        }
      ]
    },
    footer: {
      links: [
        {
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
        },
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
