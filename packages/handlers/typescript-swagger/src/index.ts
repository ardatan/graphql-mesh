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
import { generateResolversFile } from './resolvers-generator';

export type ApiServiceMapping = Record<
  string,
  { filePath: string; importName: string }
>;

const handler: MeshHandlerLibrary<PreprocessingData, ApiServiceMapping> = {
  async buildGraphQLSchema({ filePathOrUrl }) {
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

    let oass: Oas3[];

    if (Array.isArray(spec)) {
      oass = await Promise.all(
        spec.map(ele => {
          return Oas3Tools.getValidOAS3(ele);
        })
      );
    } else {
      oass = [await Oas3Tools.getValidOAS3(spec)];
    }

    const data = preprocessOas(oass, { report: { warnings: [] } } as any);
    const { schema } = await createGraphQlSchema(spec, { viewer: false });

    return {
      payload: data,
      schema
    };
  },
  async generateApiServices({ schema, payload, apiName, outputPath }) {
    console.log(payload);
    return { payload: {} };
  },
  async generateResolvers({
    apiName,
    apiServicesPayload,
    buildSchemaPayload,
    schema,
    outputPath
  }) {
    return;
  }
};

function generateOpenApiSdk(inputFile: string, outputDir: string) {
  const args = `generate -i ${inputFile} -p supportsES6=true -g typescript-node -o ${outputDir}`.split(
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
    //stdio: 'inherit',
    shell: true
  });
}

export default handler;
