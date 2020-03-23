import { readFileSync } from 'fs';
import { resolve } from 'path';
import isUrl from 'is-url';
import * as yaml from 'js-yaml';
import { fetchache, KeyValueCache } from 'fetchache';
import { createGraphQLSchema } from 'openapi-to-graphql';
import { Oas3 } from 'openapi-to-graphql/lib/types/oas3';
import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';

const handler: MeshHandlerLibrary<YamlConfig.OpenapiHandler> = {
  async getMeshSource({ config, cache }) {
    let spec: Oas3;

    if (isUrl(config.source)) {
      spec = await readUrl(config.source, cache);
    } else {
      const actualPath = config.source.startsWith('/')
        ? config.source
        : resolve(process.cwd(), config.source);

      spec = readFile(actualPath);
    }

    const { schema } = await createGraphQLSchema(spec, {
      ...(config || {}),
      operationIdFieldNames: true,
      viewer: false // Viewer set to false in order to force users to specify auth via config file
    });

    return {
      schema
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

async function readUrl(path: string, cache: KeyValueCache): Promise<Oas3> {
  const response = await fetchache(new Request(path), cache);
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
