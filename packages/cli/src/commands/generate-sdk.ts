import { GraphQLSchema, parse } from 'graphql';
import { codegen } from '@graphql-codegen/core';
import * as tsPlugin from '@graphql-codegen/typescript';
import * as tsOperationsPlugin from '@graphql-codegen/typescript-operations';
import * as tsGenericSdkPlugin from '@graphql-codegen/typescript-generic-sdk';
import { loadDocuments as loadDocumentsToolkit } from '@graphql-toolkit/core';
import { CodeFileLoader } from '@graphql-toolkit/code-file-loader';
import { GraphQLFileLoader } from '@graphql-toolkit/graphql-file-loader';
import { printSchemaWithDirectives } from '@graphql-toolkit/common';

export async function generateSdk(schema: GraphQLSchema, operationsPaths: string[]): Promise<string> {
  const documents = await loadDocumentsToolkit(operationsPaths, {
    loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
    sort: true,
    skipGraphQLImport: true,
    cwd: process.cwd(),
  });

  const output = await codegen({
    filename: 'types.ts',
    pluginMap: {
      typescript: tsPlugin,
      typescriptOperations: tsOperationsPlugin,
      typescriptGenericSdk: tsGenericSdkPlugin,
    },
    documents,
    schema: parse(printSchemaWithDirectives(schema)),
    schemaAst: schema,
    plugins: [
      {
        typescript: {},
      },
      {
        typescriptOperations: {},
      },
      {
        typescriptGenericSdk: {},
      },
    ],
    config: {},
  });

  return output;
}
