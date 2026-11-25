#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { compile } from 'json-schema-to-typescript';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { JsonFileLoader } from '@graphql-tools/json-file-loader';
import { loadSchema } from '@graphql-tools/load';
import { UrlLoader } from '@graphql-tools/url-loader';
import { DIRECTIVES } from './directives.js';
import { generateFromSchema } from './generate.js';
import { generatedMarkdown } from './md-generator.js';

async function main() {
  const { schema, typings, json, rootType, markdown } = await yargs(hideBin(process.argv))
    .option('schema', {
      required: true,
      type: 'array',
    })
    .option('json', {
      required: true,
      type: 'string',
    })
    .option('rootType', {
      type: 'string',
      default: 'Query',
    })
    .option('typings', {
      type: 'string',
    })
    .option('markdown', {
      alias: 'md',
      type: 'string',
    })
    .parse();

  const unifiedSchema = await loadSchema([...(schema as string[]), DIRECTIVES], {
    loaders: [new UrlLoader(), new JsonFileLoader(), new GraphQLFileLoader()],
  });

  const jsonSchema = generateFromSchema(unifiedSchema, rootType);
  const schemaFilePath = resolve(process.cwd(), `./${json}`);

  // Preserve Mesh's historical `Any` scalar expansion in the JSON Schema file.
  const jsonSchemaFileContent = JSON.stringify(jsonSchema, null, 2)
    .split('"type": "any"')
    .join(
      `
    "anyOf": [
      {
        "type": "object",
        "additionalProperties": true
      },
      {
        "type": "string"
      },
      {
        "type": "array",
        "additionalItems": true
      }
    ]
  `,
    );

  await writeFile(schemaFilePath, jsonSchemaFileContent);

  if (typings) {
    const tsTypes = await compile(jsonSchema, 'Config');
    const tsFilePath = resolve(process.cwd(), `./${typings}`);
    await writeFile(
      tsFilePath,
      tsTypes
        .split(
          `{
        [k: string]: any;
      }
    | string
    | any[]`,
        )
        .join('any')
        .split(
          `(
        | {
            [k: string]: any;
          }
        | string
        | any[]
      )`,
        )
        .join('any'),
    );
  }

  if (markdown) {
    const mdFiles = await generatedMarkdown(unifiedSchema);
    const mdDir = resolve(process.cwd(), `./${markdown}`);
    await mkdir(mdDir, { recursive: true });
    await Promise.all(
      mdFiles.map(async result => {
        await writeFile(join(mdDir, result.file), result.content);
      }),
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
