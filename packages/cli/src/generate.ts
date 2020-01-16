import { GraphQLSchema, printSchema, parse } from 'graphql';
import { codegen } from '@graphql-codegen/core';
import * as tsPlugin from '@graphql-codegen/typescript';
import * as tsResolversPlugin from '@graphql-codegen/typescript-resolvers';
import { writeFileSync } from 'fs';

export async function generateUnifiedResolversSignature(
  schema: GraphQLSchema,
  outputPath: string,
  mappers: Record<string, string>
): Promise<void> {
  const output = await codegen({
    filename: outputPath,
    pluginMap: {
      'typescript': tsPlugin,
      'typescript-resolvers': tsResolversPlugin
    },
    schema: parse(printSchema(schema)),
    schemaAst: schema,
    documents: [],
    plugins: [
      {
        'typescript': {},
      },
      {
        'typescript-resolvers': {
          noSchemaStitching: true,
          mappers
        }
      }
    ],
    config: {
      typesPrefix: 'Mesh_'
    }
  });

  writeFileSync(outputPath, output);
}
