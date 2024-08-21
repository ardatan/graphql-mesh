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
import { isUrl, mapMaybePromise, readFile } from '@graphql-mesh/utils';
import {
  createGraphQLError,
  isValidPath,
  type ExecutionResult,
  type MaybePromise,
} from '@graphql-tools/utils';
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
    let schema$: MaybePromise<GraphQLSchema>;
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
      let source$: MaybePromise<string>;
      if (isUrl(source)) {
        source$ = mapMaybePromise(
          ctx.fetch(source, {
            headers: schemaHeaders,
          }),
          res => res.text(),
        );
      } else if (isValidPath(source)) {
        source$ = readFile(source, {
          allowUnknownExtensions: true,
          cwd: ctx.cwd,
          fetch: ctx.fetch,
          importFn: (p: string) => import(p),
          logger: ctx.logger,
        });
      }
      schema$ = mapMaybePromise(source$, sdl =>
        buildSchema(sdl, {
          assumeValidSDL: true,
          assumeValid: true,
          noLocation: true,
        }),
      );
    } else {
      const fetchAsRegular = () =>
        mapMaybePromise(
          ctx.fetch(endpoint, {
            method: method || (useGETForQueries ? 'GET' : 'POST'),
            headers: {
              'Content-Type': 'application/json',
              ...schemaHeaders,
            },
            body: JSON.stringify({
              query: getIntrospectionQuery(),
            }),
          }),
          res => {
            assertResponseOk(res);
            return mapMaybePromise(res.json(), (result: ExecutionResult<IntrospectionQuery>) => {
              if (result.errors) {
                throw new AggregateError(
                  result.errors.map(err => createGraphQLError(err.message, err)),
                  'Introspection Query Failed',
                );
              }
              const schema = buildClientSchema(result.data, {
                assumeValid: true,
              });
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
          },
        );
      const fetchAsFederation = () =>
        mapMaybePromise(
          ctx.fetch(endpoint, {
            method: method || (useGETForQueries ? 'GET' : 'POST'),
            headers: {
              'Content-Type': 'application/json',
              ...schemaHeaders,
            },
            body: JSON.stringify({
              query: federationIntrospectionQuery,
            }),
          }),
          res => {
            assertResponseOk(res);
            return mapMaybePromise(res.json(), (result: ExecutionResult) => {
              if (result.errors) {
                throw new AggregateError(
                  result.errors.map(err => createGraphQLError(err.message, err)),
                  'Introspection Query Failed',
                );
              }
              return buildSchema(result?.data?._service?.sdl, {
                assumeValidSDL: true,
                assumeValid: true,
                noLocation: true,
              });
            });
          },
        );
      schema$ = federation ? fetchAsFederation() : fetchAsRegular();
    }
    schema$ = mapMaybePromise(schema$, handleFetchedSchema);
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
  if (schema.getDirective('transport')) {
    return schema;
  }
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
