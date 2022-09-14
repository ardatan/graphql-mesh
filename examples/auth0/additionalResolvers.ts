export const resolvers = {
  Query: {
    authInfo(_source, _args, context) {
      return context._auth0;
    },
  },
};
