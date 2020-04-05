import isUrl from 'is-url';
import { fetchache, Request, KeyValueCache } from 'fetchache';
import { createGraphQLSchema } from 'openapi-to-graphql';
import { Oas3 } from 'openapi-to-graphql/lib/types/oas3';
import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';

const handler: MeshHandlerLibrary<YamlConfig.OpenapiHandler> = {
  async getMeshSource({ config, cache }) {
    const path = config.source;
    const spec: Oas3 = await readFileOrUrl(path, cache, config);

    const { schema } = await createGraphQLSchema(spec, {
      ...(config || {}),
      operationIdFieldNames: true,
      viewer: false, // Viewer set to false in order to force users to specify auth via config file
    });

    return {
      schema,
    };
  },
};

async function readFileOrUrl<T>(
  filePathOrUrl: string,
  cache: KeyValueCache,
  config: YamlConfig.OpenapiHandler
): Promise<T> {
  if (isUrl(filePathOrUrl)) {
    return readUrl(filePathOrUrl, cache, config.schemaHeaders || {});
  } else {
    return readFile(filePathOrUrl, cache);
  }
}

async function readFile<T>(filePath: string, cache: KeyValueCache): Promise<T> {
  const [path, fs] = (await Promise.all([import('path'), import('fs')])) as [
    typeof import('path'),
    typeof import('fs')
  ];
  const actualPath = filePath.startsWith('/')
    ? filePath
    : path.resolve(process.cwd(), filePath);
  const cachedObjStr = await cache.get(actualPath);
  const stats = await fs.promises.stat(actualPath);
  if (cachedObjStr) {
    const cachedObj = JSON.parse(cachedObjStr);
    if (stats.mtimeMs <= cachedObj.mtimeMs) {
      return cachedObj.result;
    }
  }
  const resultStr = await fs.promises.readFile(actualPath, 'utf-8');
  let result: T;
  if (/json$/.test(filePath)) {
    result = JSON.parse(resultStr);
  } else if (/yaml$/.test(filePath) || /yml$/.test(filePath)) {
    const { safeLoad: loadYaml } = await import('js-yaml');
    result = loadYaml(resultStr);
  } else {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure file '${path}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml).`
    );
  }
  cache.set(filePath, JSON.stringify({ result, mtimeMs: stats.mtimeMs }));
  return result;
}

async function readUrl<T>(
  path: string,
  cache: KeyValueCache,
  headers: Record<string, any> = {}
): Promise<T> {
  const response = await fetchache(
    new Request(path, {
      headers,
    }),
    cache
  );
  const contentType = response.headers.get('content-type') || '';
  if (
    /json$/.test(path) ||
    contentType.toLowerCase().includes('application/json')
  ) {
    return response.json();
  } else if (
    /yaml$/.test(path) ||
    /yml$/.test(path) ||
    /yaml$/.test(contentType) ||
    /yml$/.test(contentType)
  ) {
    const { safeLoad: loadYaml } = await import('js-yaml');
    return loadYaml(await response.text());
  } else {
    throw new Error(
      `Failed to parse JSON/YAML. Ensure endpoint '${path}' has ` +
        `the correct extension (i.e. '.json', '.yaml', or '.yml) or mime type in the response headers.`
    );
  }
}

export default handler;
