import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { fetchache, Request } from 'fetchache';
import { UrlLoader } from '@graphql-tools/url-loader';

const handler: MeshHandlerLibrary<YamlConfig.GraphQLHandler> = {
  async getMeshSource({ config, cache }) {
    const urlLoader = new UrlLoader();
    const { schema, executor, subscriber } = await urlLoader.getSubschemaConfig(config.endpoint, {
      customFetch:
        config.customFetch ||
        ((...args) => fetchache(args[0] instanceof Request ? args[0] : new Request(...args), cache)),
      headers: config.headers,
      method: config.method,
      useGETForQueries: config.useGETForQueries,
      enableSubscriptions: config.enableSubscriptions,
      webSocketImpl: config.webSocketImpl,
    });
    return { schema, executor, subscriber };
  },
};

export default handler;
