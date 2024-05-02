import { Args } from '@e2e/args';
import {
  createRenameFieldTransform,
  createRenameTypeTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

const args = Args(process.argv);

export const composeConfig = defineConfig({
  output: args.get('output'),
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('authors', {
        endpoint: `http://localhost:${args.getServicePort('authors')}/graphql`,
      }),
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('books', {
        endpoint: `http://localhost:${args.getServicePort('books')}/graphql`,
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
        @resolveTo(
          sourceName: "authors"
          sourceTypeName: "Query"
          sourceFieldName: "authors"
          keyField: "authorId"
          keysArg: "ids"
        )
    }
  `,
});
