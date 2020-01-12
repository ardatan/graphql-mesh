import { GraphQLSchema, printSchema, parse } from 'graphql';
import { codegen } from '@graphql-codegen/core';
import * as schemaAstPlugin from '@graphql-codegen/schema-ast';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

export async function generate(
  outputPath: string,
  schema: GraphQLSchema
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

  const path = resolve(process.cwd(), outputPath);

  writeFileSync(path, output);
}
