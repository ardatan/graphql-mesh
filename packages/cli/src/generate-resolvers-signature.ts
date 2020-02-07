import { makeCleanImportRelative } from '@graphql-mesh/utils';
import { writeFileSync } from 'fs';
import { codegen } from '@graphql-codegen/core';
import * as tsPlugin from '@graphql-codegen/typescript';
import * as tsResolversPlugin from '@graphql-codegen/typescript-resolvers';
import { parse, printSchema, GraphQLSchema } from 'graphql';

export interface GenerateUnifiedResolversSignatureOptions {
  outputPath: string;
  basePath: string;
  schema: GraphQLSchema;
  context: { identifier: string, path: string },
}

export async function generateUnifiedResolversSignature({
  schema,
  outputPath,
  basePath,
  context
}: GenerateUnifiedResolversSignatureOptions) {
  const output = await codegen({
    filename: outputPath,
    pluginMap: {
      typescript: tsPlugin,
      typescriptResolvers: tsResolversPlugin
    },
    schema: parse(printSchema(schema)),
    schemaAst: schema,
    documents: [],
    plugins: [
      {
        typescript: {
          maybeValue: `T | undefined`
        },
      },
      {
        typescriptResolvers: {
          useIndexSignature: true,
          noSchemaStitching: true,
          contextType: `${makeCleanImportRelative(context.path, basePath)}#${context.identifier}`
        }
      }
    ],
    config: {}
  });

  writeFileSync(outputPath, output);
}
