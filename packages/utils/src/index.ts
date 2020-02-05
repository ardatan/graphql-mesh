import { writeFileSync } from 'fs';
import { GraphQLSchema, printSchema, parse } from 'graphql';
import { codegen } from '@graphql-codegen/core';
import * as schemaAstPlugin from '@graphql-codegen/schema-ast';

export async function generateSchemaAstFile(
  schema: GraphQLSchema,
  outputPath: string
): Promise<any> {
  const output = await codegen({
    filename: outputPath,
    pluginMap: {
      'schema-ast': schemaAstPlugin
    },
    schema: parse(printSchema(schema)),
    schemaAst: schema,
    documents: [],
    plugins: [
      {
        'schema-ast': {}
      }
    ],
    config: {}
  });

  writeFileSync(outputPath, output);
}

export function buildFileContentWithImports(
  imports: Set<string>,
  content: string = ''
): string {
  return `${Array.from(imports).join('\n')}

${content}`;
}