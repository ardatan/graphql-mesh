import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import {
  introspectSchema,
  makeRemoteExecutableSchema,
  delegateToSchema,
  IDelegateToSchemaOptions
} from 'graphql-tools-fork';
import { fetchache, Request } from 'fetchache';
import { HttpLink } from 'apollo-link-http';
import { GraphQLResolveInfo } from 'graphql';

const handler: MeshHandlerLibrary<YamlConfig.GraphQLHandler> = {
  async getMeshSource({ config, hooks, cache }) {
    const link = new HttpLink({
      uri: config.endpoint,
      fetch: (...args) => fetchache(args[0] instanceof Request ? args[0] : new Request(...args), cache),
      headers: config.headers || {}
    });
    const introspection = await introspectSchema(link);

    const remoteSchema = makeRemoteExecutableSchema({
      schema: introspection,
      link
    });

    hooks.on('buildSdkFn', ({ fieldName, typeName, replaceFn, schema }) => {
      replaceFn((args: any, context: any, info: GraphQLResolveInfo) => {
        const delegationOptions: IDelegateToSchemaOptions = {
          operation: typeName.toLowerCase() as any,
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
