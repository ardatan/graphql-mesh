import { GraphQLSchema, printSchema, parse } from 'graphql';
import { codegen } from '@graphql-codegen/core';
import * as schemaAstPlugin from '@graphql-codegen/schema-ast';
import { resolve, join } from 'path';
import { writeFileSync } from 'fs';
import * as mkdirp from 'mkdirp';

export async function generate(
  outputPath: string,
  schema: GraphQLSchema
): Promise<any> {
  const baesDir = resolve(process.cwd(), outputPath);

  try {
    mkdirp.sync(baesDir);
  } catch (e) {}

  await generateSchemaFile(baesDir, schema);
  await generateSdkFile(baesDir, schema);
}

async function generateSchemaFile(outDir: string, schema: GraphQLSchema) {
  const outputPath = join(outDir, './schema.graphql');
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

async function generateSdkFile(outDir: string, schema: GraphQLSchema) {
  const outputPath = join(outDir, './sdk.ts');
  const output = await codegen({
    filename: outputPath,
    pluginMap: {
      sdk: {
        plugin: () => {
          const types = schema.getTypeMap();
          const output = Object.keys(types).map(typeName => {
            const type = types[typeName];

            return type.name
          });

          return '';
        }
      }
    },
    schema: parse(printSchema(schema)),
    schemaAst: schema,
    documents: [],
    plugins: [
      {
        sdk: {}
      }
    ],
    config: {}
  });

  writeFileSync(outputPath, output);
}
