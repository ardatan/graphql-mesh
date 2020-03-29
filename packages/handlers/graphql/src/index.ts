import { MeshHandlerLibrary, YamlConfig } from '@graphql-mesh/types';
import {
  introspectSchema,
  makeRemoteExecutableSchema,
  delegateToSchema,
  IDelegateToSchemaOptions
} from 'graphql-tools-fork';
import { fetchache, Request } from 'fetchache';
import { loadSchema } from '@graphql-toolkit/core';
import { UrlLoader } from '@graphql-toolkit/url-loader';
import { GraphQLResolveInfo } from 'graphql';

const handler: MeshHandlerLibrary<YamlConfig.GraphQLHandler> = {
  async getMeshSource({ config, hooks, cache }) {

    const fetch: WindowOrWorkerGlobalScope['fetch'] = (...args) => fetchache(args[0] instanceof Request ? args[0] : new Request(...args), cache);
    const remoteSchema = await loadSchema(config.endpoint, {
      loaders: [ new UrlLoader() ],
      fetch,
      headers: config.headers,
    })

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
      schema: remoteSchema,
    };
  }
};

export default handler;
