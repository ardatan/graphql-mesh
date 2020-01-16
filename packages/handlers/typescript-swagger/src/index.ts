import { writeFileSync } from 'fs';
import { extname, resolve, join } from 'path';
import isUrl from 'is-url';
import request from 'request-promise-native';
import { spawnSync } from 'child_process';
import { createGraphQlSchema } from 'openapi-to-graphql';
import { Oas3 } from 'openapi-to-graphql/lib/types/oas3';
import { PreprocessingData } from 'openapi-to-graphql/lib/types/preprocessing_data';
import { preprocessOas } from 'openapi-to-graphql/lib/preprocessor';
import * as Oas3Tools from 'openapi-to-graphql/lib/oas_3_tools';
import { MeshHandlerLibrary } from '@graphql-mesh/types';
import { isObjectType, isScalarType } from 'graphql';

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
    const oass: Oas3 = await Oas3Tools.getValidOAS3(spec);
    const data = preprocessOas([oass], { report: { warnings: [] } } as any);
    const { schema } = await createGraphQlSchema(spec, { viewer: false });

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
      payload: outputFile,
    };
  }
};

function generateOpenApiSdk(inputFile: string, outputDir: string) {
  const args = `generate -i ${inputFile} -p supportsES6=true -g typescript-fetch -o ${outputDir}`.split(
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
