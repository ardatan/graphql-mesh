import { writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { Logger } from 'winston';
import { parse } from 'graphql';
import { MeshConfig } from './config';
import { codegen } from '@graphql-codegen/core';
import * as addPlugin from '@graphql-codegen/add';
import * as tsPlugin from '@graphql-codegen/typescript';
import * as tsOperationsPlugin from '@graphql-codegen/typescript-operations';
import * as tsGenericSdkPlugin from '@graphql-codegen/typescript-generic-sdk';
import { loadDocuments as loadDocumentsToolkit } from '@graphql-toolkit/core';
import { CodeFileLoader } from '@graphql-toolkit/code-file-loader';
import { GraphQLFileLoader } from '@graphql-toolkit/graphql-file-loader';

export interface GenerateSdkOptions {
  config: MeshConfig;
  logger: Logger;
}

export async function generateSdk({
  config,
  logger
}: GenerateSdkOptions): Promise<void> {
  const generatedMeshPath = resolve(
    process.cwd(),
    join(config.output, './schema/')
  );
  const outputPath = resolve(process.cwd(), join(config.output, './sdk.ts'));
  const { schema: schemaObject, schemaAst: schemaString } = await import(
    generatedMeshPath
  );

  const documents = await loadDocumentsToolkit(config.operations as string[], {
    loaders: [new CodeFileLoader(), new GraphQLFileLoader()],
    sort: true,
    skipGraphQLImport: true,
    cwd: process.cwd(),
    ...config
  });

  const output = await codegen({
    filename: outputPath,
    pluginMap: {
      add: addPlugin,
      typescript: tsPlugin,
      typescriptOperations: tsOperationsPlugin,
      typescriptGenericSdk: tsGenericSdkPlugin,
      meshSdk: {
        plugin: () => {
          const requester = `
export class GraphQLMeshSdkError<Data = {}, Variables = {}> extends Error {
  constructor(
    public errors: ReadonlyArray<GraphQLError>,
    public document: DocumentNode,
    public variables: Variables,
    public data: Data
  ) {
      super(\`GraphQL Mesh SDK Failed (\${errors.length} errors): \${errors.map(e => e.message).join('\\n\\t')}\`);
  }
}
          
const localRequester: Requester = async <R, V>(document, variables) => {
  const context = await contextBuilderFn();
  const executionResult = await execute<R>({schema, document, variableValues: variables, contextValue: context, rootValue: {}});

  if (executionResult.data && !executionResult.errors) {
    return executionResult.data as R;
  } else {
    throw new GraphQLMeshSdkError(executionResult.errors as ReadonlyArray<GraphQLError>, document, variables, executionResult.data)
  }
};

export const sdk = getSdk(localRequester);

export default sdk;`;
          
          return {
            prepend: [
              `import { schema, contextBuilderFn } from './schema';`,
              `import { execute, GraphQLError } from 'graphql';`
            ],
            content: [requester].join('\n\n')
          };
        }
      }
    },
    documents,
    schema: parse(schemaString),
    schemaAst: schemaObject,
    plugins: [
      {
        typescript: {}
      },
      {
        typescriptOperations: {}
      },
      {
        typescriptGenericSdk: {}
      },
      {
        meshSdk: {}
      }
    ],
    config: {}
  });

  writeFileSync(outputPath, output);
}
