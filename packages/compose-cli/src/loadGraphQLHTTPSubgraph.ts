import {
  buildClientSchema,
  buildSchema,
  DirectiveLocation,
  getIntrospectionQuery,
  getNamedType,
  GraphQLDirective,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  isObjectType,
  type IntrospectionQuery,
} from 'graphql';
import { isUrl, readFile } from '@graphql-mesh/utils';
import { isValidPath, type ExecutionResult } from '@graphql-tools/utils';
import type { LoaderContext, MeshComposeCLISourceHandlerDef } from './types.js';

export interface GraphQLSubgraphLoaderHTTPConfiguration {
  /**
   * A url or file path to your remote GraphQL endpoint.
   * If you provide a path to a code file(js or ts),
   * other options will be ignored and the schema exported from the file will be used directly.
   */
  endpoint: string;
  /**
   * HTTP method used for GraphQL operations (Allowed values: GET, POST)
   */
  method?: 'GET' | 'POST';
  /**
   * Use HTTP GET for Query operations
   */
  useGETForQueries?: boolean;

  // Runtime specific options
  /**
   * JSON object representing the Headers to add to the runtime of the API calls only for operation during runtime
   */
  operationHeaders?: {
    [k: string]: any;
  };

  /**
   * Request Credentials if your environment supports it.
   * [See more](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials)
   *
   * @default "same-origin" (Allowed values: omit, include)
   */
  credentials?: 'omit' | 'include';

  /**
   * Retry attempts if fails
   */
  retry?: number;

  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  // Introspection specific options

  /**
   * Path to the introspection
   * You can separately give schema introspection or SDL
   */
  source?: string;

  /**
   * JSON object representing the Headers to add to the runtime of the API calls only for schema introspection
   */
  schemaHeaders?: any;

  /**
   * Federation Subgraph
   *
   * @default false
   */
  federation?: boolean;

  /**
   * Transport kind
   *
   * @default 'http'
   */
  transportKind?: 'http';
}

export function loadGraphQLHTTPSubgraph(
  subgraphName: string,
  {
    endpoint,
    method,
    useGETForQueries,

    operationHeaders,
    credentials,
    retry,
    timeout,

    source,
    schemaHeaders,

    federation = false,

    transportKind = 'http',
  }: GraphQLSubgraphLoaderHTTPConfiguration,
): MeshComposeCLISourceHandlerDef {
  return (ctx: LoaderContext) => {
    let schema$: Promise<GraphQLSchema>;
    function handleFetchedSchema(schema: GraphQLSchema) {
      return addAnnotations(
        {
          kind: transportKind,
          subgraph: subgraphName,
          location: endpoint,
          headers: operationHeaders ? Object.entries(operationHeaders) : undefined,
          options: {
            method,
            useGETForQueries,
            credentials,
            retry,
            timeout,
          },
        },
        schema,
      );
    }
    if (source) {
      let source$: Promise<string>;
      if (isUrl(source)) {
        source$ = ctx
          .fetch(source, {
            headers: schemaHeaders,
          })
          .then(res => res.text());
      } else if (isValidPath(source)) {
        source$ = readFile(source, {
          allowUnknownExtensions: true,
          cwd: ctx.cwd,
          fetch: ctx.fetch,
          importFn: (p: string) => import(p),
          logger: ctx.logger,
        });
      }
      schema$ = source$
        .then(sdl =>
          buildSchema(sdl, {
            assumeValidSDL: true,
            assumeValid: true,
            noLocation: true,
          }),
        )
        .then(schema =>
          addAnnotations(
            {
              kind: transportKind,
              subgraph: subgraphName,
              location: endpoint,
              headers: operationHeaders ? Object.entries(operationHeaders) : undefined,
              options: {
                method,
                useGETForQueries,
                credentials,
                retry,
                timeout,
              },
            },
            schema,
          ),
        );
    } else {
      const fetchAsRegular = () =>
        ctx
          .fetch(endpoint, {
            method: method || (useGETForQueries ? 'GET' : 'POST'),
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: getIntrospectionQuery(),
            }),
          })
          .then(res => {
            assertResponseOk(res);
            return res.json();
          })
          .then((result: ExecutionResult<IntrospectionQuery>) =>
            buildClientSchema(result.data, {
              assumeValid: true,
            }),
          )
          .then(schema => {
            const queryType = schema.getQueryType();
            const queryFields = queryType?.getFields();
            if (queryFields._service) {
              const serviceType = getNamedType(queryFields._service.type);
              if (isObjectType(serviceType)) {
                const serviceTypeFields = serviceType.getFields();
                if (serviceTypeFields.sdl) {
                  return fetchAsFederation();
                }
              }
            }
            return schema;
          });
      const fetchAsFederation = () =>
        ctx
          .fetch(endpoint, {
            method: method || (useGETForQueries ? 'GET' : 'POST'),
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: federationIntrospectionQuery,
            }),
          })
          .then(res => {
            assertResponseOk(res);
            return res.json();
          })
          .then((result: ExecutionResult) => result?.data?._service?.sdl)
          .then(sdl =>
            buildSchema(sdl, {
              assumeValidSDL: true,
              assumeValid: true,
              noLocation: true,
            }),
          );
      schema$ = federation ? fetchAsFederation() : fetchAsRegular();
    }
    schema$ = schema$.then(handleFetchedSchema);
    return {
      name: subgraphName,
      schema$,
    };
  };
}

interface GraphQLHTTPTransportEntry {
  kind: 'http';
  subgraph: string;
  location: string;
  headers: [string, string][];
  options: {
    method: 'GET' | 'POST';
    useGETForQueries: boolean;
    credentials: 'omit' | 'include';
    retry: number;
    timeout: number;
  };
}

const transportDirective = new GraphQLDirective({
  name: 'transport',
  isRepeatable: true,
  locations: [DirectiveLocation.SCHEMA],
  args: {
    kind: { type: new GraphQLNonNull(GraphQLString) },
    subgraph: { type: new GraphQLNonNull(GraphQLString) },
    location: { type: new GraphQLNonNull(GraphQLString) },
    headers: { type: new GraphQLList(new GraphQLList(GraphQLString)) },
    options: { type: new GraphQLScalarType({ name: 'TransportOptions' }) },
  },
});

function addAnnotations(
  transportEntry: GraphQLHTTPTransportEntry,
  schema: GraphQLSchema,
): GraphQLSchema {
  const schemaExtensions: any = (schema.extensions ||= {});
  schemaExtensions.directives ||= {};
  schemaExtensions.directives.transport = transportEntry;
  const schemaConfig = schema.toConfig();
  return new GraphQLSchema({
    ...schemaConfig,
    directives: [...schemaConfig.directives, transportDirective],
  });
}

const federationIntrospectionQuery = /* GraphQL */ `
  query GetFederationInfo {
    _service {
      sdl
    }
  }
`;

function assertResponseOk(response: Response): asserts response is Response & { ok: true } {
  if (!response.ok) {
    throw new Error(`Failed to load GraphQL HTTP subgraph: ${response.statusText}`);
  }
}
