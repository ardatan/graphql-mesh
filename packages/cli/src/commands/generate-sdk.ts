import { GraphQLSchema, parse, print, Kind } from 'graphql';
import { codegen } from '@graphql-codegen/core';
import * as tsPlugin from '@graphql-codegen/typescript';
import * as tsOperationsPlugin from '@graphql-codegen/typescript-operations';
import * as tsGenericSdkPlugin from '@graphql-codegen/typescript-generic-sdk';
import { loadDocuments as loadDocumentsToolkit } from '@graphql-tools/load';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { printSchemaWithDirectives, Source, buildOperationNodeForField, Operation } from '@graphql-tools/utils';

export async function generateSdk(
  schema: GraphQLSchema,
  {
    operations: operationsPaths = [],
    depth: depthLimit = 2,
  }: {
    operations?: string[];
    depth?: number;
  }
): Promise<string> {
  let documents: Source[] = [];
  if (operationsPaths.length) {
    documents = await loadDocumentsToolkit(operationsPaths, {
      loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
      sort: true,
      skipGraphQLImport: true,
      cwd: process.cwd(),
    });
  } else {
    const rootTypeMap = {
      query: schema.getQueryType(),
      mutation: schema.getMutationType(),
      subscription: schema.getSubscriptionType(),
    };
    for (const operationType in rootTypeMap) {
      const rootType = rootTypeMap[operationType];
      if (rootType) {
        for (const fieldName in rootType.getFields()) {
          const operation = buildOperationNodeForField({
            schema,
            field: fieldName,
            kind: operationType as Operation,
            depthLimit,
          });
          documents.push({
            document: {
              kind: Kind.DOCUMENT,
              definitions: [operation],
            },
            rawSDL: print(operation),
            location: `${operation.name?.value}.graphql`,
          });
        }
      }
    }
  }

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
