import { writeFileSync } from 'fs';
import { extname, resolve, join } from 'path';
import isUrl from 'is-url';
import request from 'request-promise-native';
import { spawnSync } from 'child_process';
import { createGraphQlSchema } from '@dotansimha/openapi-to-graphql';
import { Oas3 } from '@dotansimha/openapi-to-graphql/lib/types/oas3';
import { Operation } from '@dotansimha/openapi-to-graphql/lib/types/operation';
import { PreprocessingData } from '@dotansimha/openapi-to-graphql/lib/types/preprocessing_data';
import { preprocessOas } from '@dotansimha/openapi-to-graphql/lib/preprocessor';
import * as Oas3Tools from '@dotansimha/openapi-to-graphql/lib/oas_3_tools';
import { MeshHandlerLibrary } from '@graphql-mesh/types';
import { isObjectType, isScalarType } from 'graphql';
import * as changeCase from 'change-case';

export type ApiServiceResult = {
  apiTypesPath: string;
};

export type BuildGraphQLSchemaPayload = {
  schemaPreprocessingData: PreprocessingData;
  oas3: Oas3;
};

const handler: MeshHandlerLibrary<
  BuildGraphQLSchemaPayload,
  ApiServiceResult
> = {
  async buildGraphQLSchema({ filePathOrUrl, outputPath }) {
    let spec = null;

    if (isUrl(filePathOrUrl)) {
      spec = JSON.parse(await request(filePathOrUrl));
    } else {
      const actualPath = filePathOrUrl.startsWith('/')
        ? filePathOrUrl
        : resolve(process.cwd(), filePathOrUrl);
      const fileExt = extname(actualPath).toLowerCase();

      if (fileExt === '.json') {
        spec = require(actualPath);
      }
    }

    // TODO: `spec` might be an array?

    const transformOptions = { viewer: false, operationIdFieldNames: true };
    const oass: Oas3 = await Oas3Tools.getValidOAS3(spec);
    const { schema, data } = await createGraphQlSchema(spec, transformOptions);

    return {
      payload: {
        schemaPreprocessingData: data,
        oas3: oass
      },
      schema
    };
  },
  async generateApiServices({ payload: { oas3 }, outputPath }) {
    const oasFilePath = join(outputPath, './oas3-schema.json');
    const apiTypesPath = join(outputPath, './types');
    writeFileSync(oasFilePath, JSON.stringify(oas3, null, 2));
    generateOpenApiSdk(oasFilePath, apiTypesPath);

    return {
      payload: {
        apiTypesPath
      }
    };
  },
  async generateResolvers({
    apiName,
    apiServicesPayload,
    buildSchemaPayload,
    schema,
    outputPath
  }) {
    const outputFile = join(outputPath, './resolvers.ts');
    const types = schema.getTypeMap();

    const output = ([
      schema.getQueryType()?.name,
      schema.getMutationType()?.name,
      schema.getSubscriptionType()?.name
    ].filter(Boolean) as string[]).map(typeName => {
      const type = types[typeName];

      if (isScalarType(type) || typeName.startsWith('__')) {
        return null;
      }

      if (isObjectType(type)) {
        const fields = type.getFields();
        const fieldsResolvers = Object.keys(fields).map(fieldName => {
          const serviceOperation =
            buildSchemaPayload.schemaPreprocessingData.operations[fieldName];
          const apiServiceName = 

          return `    ${fieldName}: (root, args, context, info) => { console.log('called resolver ${typeName}.${fieldName}') },`;
        });

        return `  ${type.name}: {
${fieldsResolvers.join('\n')}
  },`;
      }

      return null;
    });

    const result = `export const resolvers = {
${output.filter(Boolean).join('\n')}
};`;

    writeFileSync(outputFile, result);

    return {
      payload: outputFile
    };
  }
};

function generateOpenApiSdk(inputFile: string, outputDir: string) {
  const args = `generate -i ${inputFile} -p supportsES6=true -p typescriptThreePlus=true -g typescript-fetch -o ${outputDir}`.split(
    ' '
  );
  const binPath = require.resolve(
    '@openapitools/openapi-generator-cli/bin/openapi-generator.jar'
  );
  const JAVA_OPTS = process.env['JAVA_OPTS'] || '';

  let command = `java ${JAVA_OPTS} -jar "${binPath}"`;

  if (args) {
    command += ` ${args.join(' ')}`;
  }

  spawnSync(command, {
    // stdio: 'inherit',
    shell: true
  });
}

export default handler;

function sortOperations(op1: any, op2: any) {
  // Sort by object/array type
  if (
    op1.responseDefinition.schema.type === 'array' &&
    op2.responseDefinition.schema.type !== 'array'
  ) {
    return 1;
  } else if (
    op1.responseDefinition.schema.type !== 'array' &&
    op2.responseDefinition.schema.type === 'array'
  ) {
    return -1;
  } else {
    // Sort by GET/non-GET method
    if (op1.method === 'get' && op2.method !== 'get') {
      return -1;
    } else if (op1.method !== 'get' && op2.method === 'get') {
      return 1;
    } else {
      return 0;
    }
  }
}
