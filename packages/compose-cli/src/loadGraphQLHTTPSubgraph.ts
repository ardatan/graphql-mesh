import {
  buildClientSchema,
  buildSchema,
  getIntrospectionQuery,
  GraphQLSchema,
  IntrospectionQuery,
} from 'graphql';
import { ExecutionResult } from '@graphql-tools/utils';
import { LoaderContext } from './types';

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
   * Subgraph spec
   *
   * @default false
   */
  spec?: 'federation' | 'stitching' | 'fusion' | false;

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

    spec = false,

    transportKind = 'http',
  }: GraphQLSubgraphLoaderHTTPConfiguration,
) {
  return (ctx: LoaderContext) => {
    let schema$: Promise<GraphQLSchema>;
    function handleFetchedSchema(schema: GraphQLSchema) {
      return addAnnotations(
        {
          kind: transportKind,
          subgraph: subgraphName,
          location: endpoint,
          headers: operationHeaders,
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
      schema$ = ctx
        .fetch(source, {
          headers: schemaHeaders,
        })
        .then(res => res.text())
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
              headers: operationHeaders,
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
      switch (spec) {
        case false:
          schema$ = ctx
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
            );
          break;
        case 'federation':
          schema$ = ctx
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
              return res.text();
            })
            .then(sdl =>
              buildSchema(sdl, {
                assumeValidSDL: true,
                assumeValid: true,
                noLocation: true,
              }),
            );
          break;
        default:
          throw new Error(`Unsupported spec: ${spec}`);
      }
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
  headers: Record<string, string>;
  options: {
    method: 'GET' | 'POST';
    useGETForQueries: boolean;
    credentials: 'omit' | 'include';
    retry: number;
    timeout: number;
  };
}

function addAnnotations(
  transportEntry: GraphQLHTTPTransportEntry,
  schema: GraphQLSchema,
): GraphQLSchema {
  const schemaExtensions: any = (schema.extensions ||= {});
  schemaExtensions.directives ||= {};
  schemaExtensions.directives.transport = transportEntry;
  return schema;
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
