import { extname, resolve } from 'path';
import SwaggerParser from 'swagger-parser';
import isUrl from 'is-url';
import request from 'request-promise-native';
import { spawnSync } from 'child_process';

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
  generate(
    `generate -i ${filePathOrUrl} -p supportsES6=true -g typescript-node -o ${outputPath}/${apiName}`.split(
      ' '
    )
  );

  return null;
}

function generate(args: string[]) {
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
