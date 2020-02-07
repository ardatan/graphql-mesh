import { writeFileSync } from 'fs';
import { GraphQLSchema, printSchema, parse } from 'graphql';
import { codegen } from '@graphql-codegen/core';
import * as schemaAstPlugin from '@graphql-codegen/schema-ast';
import { relative, sep } from 'path';

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

export function makeCleanImportRelative(path: string, basePath: string, keepExtension = false): string {
  const relativePath = relative(basePath, path);
  const relativeWithoutExtension = keepExtension ? relativePath : relativePath.split('.').slice(0, -1).join('.');
  const splitted = relativeWithoutExtension.split(sep);

  if (splitted[splitted.length - 1] === 'index') {
    splitted.pop();
  }

  let clearFileImport = splitted.join(sep);

  if (!clearFileImport.startsWith('.')) {
    clearFileImport = `./${clearFileImport}`;
  }

  return clearFileImport;
} 