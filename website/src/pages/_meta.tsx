import { Callout, MDXLink } from '@theguild/components';
import { PRODUCTS_MENU_LIST } from '@theguild/components/products';

const meta = {
  index: {
    title: 'Home',
    type: 'page',
    display: 'hidden',
    theme: {
      layout: 'raw',
    },
  },
  examples: {
    title: 'Examples',
    type: 'page',
    display: 'hidden',
    theme: {
      layout: 'raw',
    },
  },
  v1: {
    title: 'v1',
    type: 'page',
  },
  docs: {
    title: 'v0',
    type: 'page',
    theme: {
      topContent: LegacyDocsBanner,
    },
  },
  products: {
    title: 'Products',
    type: 'menu',
    items: PRODUCTS_MENU_LIST,
  },
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

function LegacyDocsBanner() {
  return (
    <Callout type="warning">
      This is the documentation for the <b>old</b> GraphQL Mesh version v0. We recommend upgrading
      to the latest GraphQL Mesh version v1.
      <br />
      <br />
      <MDXLink href="/v1/migration-from-v0">Migrate to GraphQL Mesh v1</MDXLink>
    </Callout>
  );
}

export default meta;
