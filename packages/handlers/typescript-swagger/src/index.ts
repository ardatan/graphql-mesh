import { extname, resolve, join } from 'path';
import SwaggerParser from 'swagger-parser';
import isUrl from 'is-url';
import request from 'request-promise-native';
import { spawnSync } from 'child_process';
import { createGraphQlSchema } from 'openapi-to-graphql';

export default async function(
  apiName: string,
  outputPath: string,
  filePathOrUrl: string
): Promise<any> {
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

  const api = await SwaggerParser.validate(spec);
  const baseSdkDir = join(outputPath, `./${apiName}/`);
  generateOpenApiSdk(filePathOrUrl, baseSdkDir);
  const { schema } = await createGraphQlSchema(spec);

  console.log(api, schema.getQueryType()?.getFields());

  return schema;
}

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

  spawnSync(command, { stdio: 'inherit', shell: true });
}
