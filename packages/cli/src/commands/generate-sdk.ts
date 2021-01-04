import { GraphQLSchema, Kind, print } from 'graphql';
import { codegen } from '@graphql-codegen/core';
import * as tsPlugin from '@graphql-codegen/typescript';
import * as tsOperationsPlugin from '@graphql-codegen/typescript-operations';
import * as tsGenericSdkPlugin from '@graphql-codegen/typescript-generic-sdk';
import { loadDocuments as loadDocumentsToolkit } from '@graphql-tools/load';
import { CodeFileLoader } from '@graphql-tools/code-file-loader';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { buildOperationNodeForField, Source } from '@graphql-tools/utils';
import { clientSideScalarsMap } from './scalars-map';
import { logger } from '../logger';

export async function generateSdk(
  schema: GraphQLSchema,
  {
    operations: operationsPaths = [],
    depth: depthLimit = 1,
    'flatten-types': flattenTypes,
  }: {
    operations?: string[];
    depth?: number;
    'flatten-types': boolean;
  }
): Promise<string> {
  let sources: Source[] = [];
  if (operationsPaths.length) {
    sources = await loadDocumentsToolkit(operationsPaths, {
      loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
      skipGraphQLImport: true,
      cwd: process.cwd(),
    });
  } else {
    logger.warn(`You didn't provide operations for SDK! 
Mesh CLI will try to generate operations for you but this might not be efficient for production usage. 
See more: https://graphql-mesh.com/docs/recipes/as-sdk`);
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
            kind: operationType as any,
            depthLimit,
          });
          const document = {
            kind: Kind.DOCUMENT,
            definitions: [operation],
          };
          sources.push({
            document,
            rawSDL: print(document),
            location: `${fieldName}_${operationType}.graphql`,
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
    documents: sources,
    skipDocumentsValidation: true,
    schema: undefined as any, // This is not necessary on codegen.
    schemaAst: schema,
    plugins: [
      {
        typescript: {
          ignoreEnumValuesFromSchema: true,
        },
      },
      {
        typescriptOperations: {},
      },
      {
        typescriptGenericSdk: {},
      },
    ],
    config: {
      flattenGeneratedTypes: flattenTypes,
      scalars: clientSideScalarsMap,
      onlyOperationTypes: flattenTypes,
      preResolveTypes: flattenTypes,
      namingConvention: {
        enumValues: 'keep',
      },
      documentMode: 'documentNode',
    },
  });

  return output;
}
