import { OperationTypeNode } from 'graphql';
import { useAuth0 } from '@envelop/auth0';
import { defineConfig as defineComposeConfig } from '@graphql-mesh/compose-cli';
import useOperationFieldPermissions from '@graphql-mesh/plugin-operation-field-permissions';
import { defineConfig as defineServeConfig } from '@graphql-mesh/serve-cli';
import { useStaticFiles } from '@graphql-mesh/serve-runtime';
import { loadJSONSchemaSubgraph } from '@omnigraph/json-schema';

export const composeConfig = defineComposeConfig({
  subgraphs: [
    {
      sourceHandler: loadJSONSchemaSubgraph('OpenBreweryDB', {
        endpoint: 'http://localhost:3001',
        operations: [
          {
            type: OperationTypeNode.QUERY,
            field: 'secret',
            path: '/',
            method: 'POST',
            responseSample: {
              code: 'MY_SECRET',
              timestamp: 0,
            },
          },
        ],
      }),
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    """
    Describes the authentication object as provided by Auth0.
    """
    type AuthenticationInfo {
      """
      String that uniquely identifies an authenticated user.
      """
      sub: String!
    }

    extend type Query {
      """
      The authentication information of the request.
      """
      authInfo: AuthenticationInfo
    }
  `,
});

export const serveConfig = defineServeConfig({
  supergraph: './supergraph.graphql',
  plugins: ctx => [
    useAuth0({
      ...ctx,
      domain: '{account_name}.{region}.auth0.com',
      audience: 'http://localhost:3000/graphql',
      extendContextField: '_auth0',
      // No need to provide unauthorized access
      preventUnauthenticatedAccess: false,
    }),
    useOperationFieldPermissions({
      ...ctx,
      permissions: [
        {
          if: 'context._auth0?.sub != null',
          allow: ['*'],
        },
      ],
    }),
    useStaticFiles({
      baseDir: ctx.cwd,
      staticFiles: 'public',
    }),
  ],
  additionalResolvers: {
    Query: {
      authInfo(_source, _args, context: any) {
        return context._auth0;
      },
    },
  },
});
