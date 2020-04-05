import { readFileOrUrlWithCache } from '@graphql-mesh/utils';
import { createGraphQLSchema } from 'openapi-to-graphql';
import { Oas3 } from 'openapi-to-graphql/lib/types/oas3';
import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';

const handler: MeshHandlerLibrary<YamlConfig.OpenapiHandler> = {
  async getMeshSource({ config, cache }) {
    const path = config.source;
    const spec: Oas3 = await readFileOrUrlWithCache(path, cache, {
      headers: config.schemaHeaders
    });

    const { schema } = await createGraphQLSchema(spec, {
      headers: config.operationHeaders,
      operationIdFieldNames: true,
      viewer: false, // Viewer set to false in order to force users to specify auth via config file
    });

    return {
      schema,
    };
  },
};

export default handler;
