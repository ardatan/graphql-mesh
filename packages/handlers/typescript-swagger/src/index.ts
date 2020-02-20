import { readFileSync } from 'fs';
import { resolve } from 'path';
import isUrl from 'is-url';
import * as yaml from 'js-yaml';
import request from 'request-promise-native';
import { createGraphQLSchema } from 'openapi-to-graphql';
import { Oas3 } from 'openapi-to-graphql/lib/types/oas3';
import { Options } from 'openapi-to-graphql/lib/types/options';
import { MeshHandlerLibrary } from '@graphql-mesh/types';

const handler: MeshHandlerLibrary<Options> = {
  async getMeshSource({ filePathOrUrl, name, config }) {
    let spec = null;

    // Load from a url or from a local file. only json supported at the moment.
    // I think `getValidOAS3` should support loading YAML files easily
    if (isUrl(filePathOrUrl)) {
      spec = JSON.parse(await request(filePathOrUrl));
    } else {
      const actualPath = filePathOrUrl.startsWith('/')
        ? filePathOrUrl
        : resolve(process.cwd(), filePathOrUrl);

      spec = readFile(actualPath);
    }

    const { schema } = await createGraphQLSchema(spec, {
      ...(config || {}),
      viewer: false, // TODO: Support viewer: true use case
    });

    const queryType = schema.getQueryType();
    const sdk: Record<string, Function> = {};

    // TODO: Handle a use case where `viewer: true`
    // TODO: API
    // if (queryType) {
    //   const fields = queryType.getFields();
    //   Object.keys(fields).forEach(fieldName => {

    //   });
    // }

    return {
      schema,
      sdk: {}, // TODO: Extract SDK methods from buitl Query type and expose it as is.
      name,
      source: filePathOrUrl
    };
  }
};

function readFile(path: string): Oas3 {
  if (/json$/.test(path)) {
    return JSON.parse(readFileSync(path, 'utf8'));
  } else if (/yaml$/.test(path) || /yml$/.test(path)) {
    return yaml.safeLoad(readFileSync(path, 'utf8'));
  } else {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure file '${path}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml).`
    );
  }
}

export default handler;
