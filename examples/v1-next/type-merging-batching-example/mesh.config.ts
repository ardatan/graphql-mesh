import {
  createRenameFieldTransform,
  createRenameTypeTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('authors', {
        endpoint: 'http://localhost:4001/graphql',
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('books', {
        endpoint: 'http://localhost:4002/graphql',
      }),
      transforms: [
        createRenameFieldTransform((_field, fieldName, typeName) =>
          typeName === 'Query' && fieldName === 'authorWithBooks' ? 'author' : fieldName,
        ),
        createRenameTypeTransform(type => (type.name === 'AuthorWithBooks' ? 'Author' : type.name)),
      ],
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend type Book {
      author: Author
        @variable(name: "bookAuthorId", select: "authorId", subgraph: "books")
        @resolver(
          subgraph: "authors"
          operation: """
          query AuthorOfBook($bookAuthorId: ID!) {
            author(id: $bookAuthorId)
          }
          """
        )
    }
  `,
});
