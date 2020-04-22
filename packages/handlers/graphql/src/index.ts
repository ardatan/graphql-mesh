import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { fetchache, Request } from 'fetchache';
import { loadSchema } from '@graphql-toolkit/core';
import { UrlLoader } from '@graphql-toolkit/url-loader';

const handler: MeshHandlerLibrary<YamlConfig.GraphQLHandler> = {
  async getMeshSource({ config, hooks, cache }) {
    const fetch: WindowOrWorkerGlobalScope['fetch'] = (...args) =>
      fetchache(args[0] instanceof Request ? args[0] : new Request(...args), cache);
    const schema = await loadSchema(config.endpoint, {
      loaders: [new UrlLoader()],
      fetch,
      headers: config.headers,
    });

    return {
      schema,
    };
  },
};

export default handler;
