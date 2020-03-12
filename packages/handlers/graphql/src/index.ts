import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import {
  introspectSchema,
  makeRemoteExecutableSchema,
  defaultCreateRemoteResolver,
  delegateToSchema
} from 'graphql-tools-fork';
import fetch from 'cross-fetch';
import { HttpLink } from 'apollo-link-http';
import { SelectionSetNode, GraphQLResolveInfo, execute } from 'graphql';

const handler: MeshHandlerLibrary<YamlConfig.GraphQLHandlerConfig> = {
  async getMeshSource({ filePathOrUrl, config, hooks }) {
    const link = new HttpLink({
      uri: filePathOrUrl,
      fetch,
      headers: config?.headers || {}
    });
    const introspection = await introspectSchema(link);

    const remoteSchema = makeRemoteExecutableSchema({
      schema: introspection,
      link,
    });

    hooks.on('buildSdkFn', ({ fieldName, typeName, replaceFn, schema }) => {
      replaceFn((args: any, context: any, info: GraphQLResolveInfo) => {
        const delegationOptions = {
          operation: typeName.toLowerCase() as any,
          fieldName,
          schema,
          args,
          info,
          context,
        };

        return delegateToSchema(delegationOptions);
      })
    })

    return {
      schema: remoteSchema
    };
  }
};

export default handler;
