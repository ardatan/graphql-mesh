import { Args } from '@e2e/args';
import {
  createRenameFieldTransform,
  createRenameTypeTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

const args = Args(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('authors', {
        endpoint: `http://localhost:${args.getServicePort('authors', true)}/graphql`,
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('books', {
        endpoint: `http://localhost:${args.getServicePort('books', true)}/graphql`,
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
