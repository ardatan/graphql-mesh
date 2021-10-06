const { ApolloServer } = require('apollo-server');

module.exports = async ({
  getBuiltMesh,
  documents,
  logger
}) => {
  const { schema } = await getBuiltMesh();
  const apolloServer = new ApolloServer({
    schema,
    context: ({ req }) => req,
    playground: {
      tabs: documents.map(({ location, rawSDL }) => ({
        name: location,
        endpoint: '/graphql',
        query: rawSDL,
      })),
    },
  });

  const { url } = await apolloServer.listen(4000);
  logger.info(`🚀 Server ready at ${url}`);
};
