export default {
  index: {
    title: 'Home',
    type: 'page',
    display: 'hidden',
    theme: {
      layout: 'raw',
    },
  },
  docs: {
    title: 'Docs',
    type: 'page',
    theme: {
      toc: true,
    },
  },
  examples: {
    title: 'Examples',
    type: 'page',
    theme: {
      layout: 'raw',
    },
  },
  'product-updates': {
    type: 'page',
    title: 'Product Updates',
    theme: {
      sidebar: false,
      toc: true,
      breadcrumb: false,
      typesetting: 'article',
    },
  },
};
