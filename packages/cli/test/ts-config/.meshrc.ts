export default {
  sources: [
    {
      name: 'Dummy',
      handler: {
        graphql: {
          source: '../fixtures/dummy-schema.graphql',
        },
      },
    },
  ],
};
