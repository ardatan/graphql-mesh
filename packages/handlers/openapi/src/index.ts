import { readFileOrUrlWithCache } from '@graphql-mesh/utils';
import { createGraphQLSchema } from '@ardatan/openapi-to-graphql';
import { Oas3 } from '@ardatan/openapi-to-graphql/lib/types/oas3';
import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { fetchache, Request } from 'fetchache';

const handler: MeshHandlerLibrary<YamlConfig.OpenapiHandler> = {
  async getMeshSource({ config, cache }) {
    const path = config.source;
    const spec = await readFileOrUrlWithCache<Oas3>(path, cache, {
      headers: config.schemaHeaders,
    });

    const fetch: WindowOrWorkerGlobalScope['fetch'] = (...args) =>
      fetchache(args[0] instanceof Request ? args[0] : new Request(...args), cache);

    const { schema } = await createGraphQLSchema(spec, {
      fetch,
      baseUrl: config.baseUrl,
      headers: config.operationHeaders,
      skipSchemaValidation: config.skipSchemaValidation,
      operationIdFieldNames: true,
      viewer: false, // Viewer set to false in order to force users to specify auth via config file
    });

    return {
      schema,
    };
  },
};

export default handler;
