// import { PRODUCTS_MENU_LIST } from '@theguild/components/products';

const meta = {
  examples: {
    title: 'Examples',
    type: 'page',
    display: 'hidden',
  },
  v1: {
    title: 'v1',
    type: 'page',
  },
  docs: {
    title: 'v0',
    type: 'page',
  },
  // #region shared items between all websites
  // TODO: Move it to shared layout.
  // products: PRODUCTS_MENU_LIST,
  ecosystem: {
    title: 'Ecosystem',
    type: 'page',
    href: 'https://the-guild.dev/graphql/hive/ecosystem',
  },
  blog: {
    title: 'Blog',
    type: 'page',
    href: 'https://the-guild.dev/blog',
  },
  github: {
    title: 'GitHub',
    type: 'page',
    href: 'https://github.com/ardatan/graphql-mesh',
  },
  'the-guild': {
    title: 'The Guild',
    type: 'menu',
    items: {
      'about-us': {
        title: 'About Us',
        href: 'https://the-guild.dev/about-us',
      },
      'brand-assets': {
        title: 'Brand Assets',
        href: 'https://the-guild.dev/logos',
      },
    },
  },
  'graphql-foundation': {
    title: 'GraphQL Foundation',
    type: 'page',
    href: 'https://graphql.org/community/foundation/',
  },
  // #endregion
};

export default meta;
