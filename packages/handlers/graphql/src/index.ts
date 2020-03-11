import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import { introspectSchema, makeRemoteExecutableSchema } from 'graphql-tools-fork';
import fetch from 'cross-fetch';
import { HttpLink } from 'apollo-link-http';

const handler: MeshHandlerLibrary<YamlConfig.GraphQLHandlerConfig> = {
  async getMeshSource({ filePathOrUrl, config }) {
    const link = new HttpLink({ uri: filePathOrUrl, fetch, headers: config?.headers || {} });
    const introspection = await introspectSchema(link);

    const remoteSchema = makeRemoteExecutableSchema({
      schema: introspection,
      link,
    });

    return {
      schema: remoteSchema
    };
  }
};

export default handler;
