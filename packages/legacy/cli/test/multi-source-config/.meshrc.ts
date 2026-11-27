export default {
  sources: [
    {
      name: 'DummyA',
      handler: {
        graphql: {
          source: '../fixtures/dummy-schema.graphql',
        },
      },
    },
    {
      name: 'DummyB',
      handler: {
        graphql: {
          source: '../fixtures/dummy-schema-b.graphql',
        },
      },
    },
  ],
};
