import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import {
  introspectSchema,
  makeRemoteExecutableSchema,
  delegateToSchema
} from 'graphql-tools-fork';
import { fetchache, Request } from 'fetchache';
import { HttpLink } from 'apollo-link-http';
import { GraphQLResolveInfo } from 'graphql';

const handler: MeshHandlerLibrary<YamlConfig.GraphQLHandler> = {
  async getMeshSource({ config, hooks, cache }) {
    const link = new HttpLink({
      uri: config.endpoint,
      fetch: (info, init) => fetchache(typeof info === 'string' ? new Request(info, init) : info, cache),
      headers: config.headers || {}
    });
    const introspection = await introspectSchema(link);

    const remoteSchema = makeRemoteExecutableSchema({
      schema: introspection,
      link
    });

    hooks.on('buildSdkFn', ({ fieldName, replaceFn, schema }) => {
      replaceFn((args: any, context: any, info: GraphQLResolveInfo) => {
        const delegationOptions = {
          operation: info.operation.operation,
          fieldName,
          schema,
          args,
          info,
          context
        };

        return delegateToSchema(delegationOptions);
      });
    });

    return {
      schema: remoteSchema
    };
  }
};

export default handler;
