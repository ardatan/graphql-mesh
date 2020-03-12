import { readFileSync } from 'fs';
import { resolve } from 'path';
import isUrl from 'is-url';
import * as yaml from 'js-yaml';
import { fetch } from 'cross-fetch';
import { createGraphQLSchema } from 'openapi-to-graphql';
import { Oas3 } from 'openapi-to-graphql/lib/types/oas3';
import { Options } from 'openapi-to-graphql/lib/types/options';
import { MeshHandlerLibrary } from '@graphql-mesh/types';

const handler: MeshHandlerLibrary<Options> = {
  async getMeshSource({ filePathOrUrl, name, config }) {
    let spec: Oas3;

    if (isUrl(filePathOrUrl)) {
      spec = await readUrl(filePathOrUrl);
    } else {
      const actualPath = filePathOrUrl.startsWith('/')
        ? filePathOrUrl
        : resolve(process.cwd(), filePathOrUrl);

      spec = readFile(actualPath);
    }

    const { schema } = await createGraphQLSchema(spec, {
      ...(config || {}),
      operationIdFieldNames: true,
      viewer: false // Viewer set to false in order to force users to specify auth via config file
    });

    return {
      schema,
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

async function readUrl(path: string): Promise<Oas3> {
  const response = await fetch(path);
  const contentType = response.headers.get('content-type') || '';
  if (/json$/.test(path) || /json$/.test(contentType)) {
    return response.json();
  } else if (
    /yaml$/.test(path) ||
    /yml$/.test(path) ||
    /yaml$/.test(contentType) ||
    /yml$/.test(contentType)
  ) {
    return yaml.safeLoad(await response.text());
  } else {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure endpoint '${path}' has ` +
      `the correct extension (i.e. '.json', '.yaml', or '.yml) or mime type in the response headers.`
    );
  }
}

export default handler;
