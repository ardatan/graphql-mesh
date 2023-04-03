import { createUploadLink } from 'apollo-upload-client';
import { ApolloClient, InMemoryCache } from '@apollo/client';

export default new ApolloClient({
  cache: new InMemoryCache(),
  link: createUploadLink({
    uri: 'http://localhost:4000/graphql',
  }),
});
