import { Opts } from '@e2e/opts';
import {
  createRenameFieldTransform,
  createRenameTypeTransform,
  defineConfig,
  loadGraphQLHTTPSubgraph,
} from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('authors', {
        endpoint: `http://localhost:${opts.getServicePort('authors')}/graphql`,
      }),
      transforms: [
        createRenameFieldTransform(({ fieldName, typeName }) =>
          typeName === 'Query' && fieldName === 'authors' ? 'writers' : fieldName,
        ),
      ],
    },
    {
      sourceHandler: loadGraphQLHTTPSubgraph('books', {
        endpoint: `http://localhost:${opts.getServicePort('books')}/graphql`,
      }),
      transforms: [
        createRenameFieldTransform(({ fieldName, typeName }) =>
          typeName === 'Query' && fieldName === 'authorWithBooks' ? 'author' : fieldName,
        ),
        createRenameTypeTransform(({ typeName }) =>
          typeName === 'AuthorWithBooks' ? 'Author' : typeName,
        ),
      ],
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend type Book {
      author: Author
        @resolveTo(
          sourceName: "authors"
          sourceTypeName: "Query"
          sourceFieldName: "writers"
          keyField: "authorId"
          keysArg: "ids"
        )
    }
  `,
});
