const { ApolloServer } = require('apollo-server');
const { getMesh } = require('@graphql-mesh/runtime');

module.exports = async ({
  getMeshOptions,
  documents
}) => {
  const { schema, contextBuilder } = await getMesh(getMeshOptions);
  const apolloServer = new ApolloServer({
    schema,
    context: contextBuilder,
    playground: {
      tabs: documents.map(({ location, rawSDL }) => ({
          name: location,
          endpoint: '/graphql',
          query: rawSDL,
      })),
    }
  });

  const { url } = await apolloServer.listen(4000);
  getMeshOptions.logger.info(`🚀 Server ready at ${url}`);
};
