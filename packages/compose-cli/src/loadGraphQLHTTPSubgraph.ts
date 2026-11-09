import {
  buildASTSchema,
  buildClientSchema,
  buildSchema,
  DirectiveLocation,
  getIntrospectionQuery,
  getNamedType,
  GraphQLDirective,
  GraphQLError,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  isObjectType,
  Kind,
  parse,
  visit,
  type DocumentNode,
  type IntrospectionOptions,
  type IntrospectionQuery,
} from 'graphql';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { isUrl, readFile } from '@graphql-mesh/utils';
import { isValidPath, type ExecutionResult } from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';
import type { MaybePromise } from '@whatwg-node/promise-helpers';
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

  /**
   * While introspecting the schema, you can customize the introspection query by providing these options.
   * This is useful if you have a GraphQL server that does not support some of the newer features of GraphQL.
   *
   * By default, Mesh has the following options;
   *
   * ```json
   * {
   *  "descriptions": true,
   *  "specifiedByUrl": false,
   *  "directiveIsRepeatable": false,
   *  "schemaDescription": false,
   *  "inputValueDeprecation": true,
   *  "oneOf": false
   * }
   * ```
   */
  introspectionOptions?: IntrospectionOptions;
}

const ROOT_TYPE_NAMES = new Set(['Query', 'Mutation', 'Subscription']);

function withExtendsDirective<
  TNode extends {
    directives?: readonly any[];
    kind: Kind;
  },
>(node: TNode, kind: TNode['kind']) {
  return {
    ...node,
    directives: [
      ...(node.directives || []),
      {
        kind: Kind.DIRECTIVE,
        name: {
          kind: Kind.NAME,
          value: 'extends',
        },
      },
    ],
    kind,
  };
}

/**
 * Normalize federation `_service.sdl` for Mesh composition.
 *
 * @apollo/subgraph >= 2.15 emits:
 * - `extend type Query { _entities _service }` alongside `type Query { ... }`
 * - empty `type Foo` stubs next to `extend type Foo { ... }` for Fed1 schemas
 *
 * Converting root-type extensions into `@extends` definitions overwrites Query
 * fields, and empty stubs leave entity types fieldless. Keep root extensions as
 * extensions, convert other extensions to `@extends` definitions, then drop
 * empty duplicate stubs.
 */
export function fixExtends(node: DocumentNode): DocumentNode {
  const document = visit(node, {
    [Kind.DIRECTIVE](directiveNode) {
      if (directiveNode.name.value === 'link') {
        const url = directiveNode.arguments?.find(arg => arg.name.value === 'url')?.value;
        if (
          url?.kind === Kind.STRING &&
          url.value.startsWith('https://specs.apollo.dev/federation/v2.')
        ) {
          const imports = directiveNode.arguments?.find(arg => arg.name.value === 'import')?.value;
          if (imports?.kind === Kind.LIST) {
            // @ts-expect-error - We can modify it
            imports.values.push({
              kind: Kind.STRING,
              value: '@extends',
            });
          }
        }
      }
    },
    [Kind.OBJECT_TYPE_EXTENSION](typeNode) {
      // Keep Query/Mutation/Subscription as extensions so they merge with the
      // existing root type instead of replacing it.
      if (ROOT_TYPE_NAMES.has(typeNode.name.value)) {
        return undefined;
      }
      return withExtendsDirective(typeNode, Kind.OBJECT_TYPE_DEFINITION);
    },
    [Kind.INTERFACE_TYPE_EXTENSION](typeNode) {
      return withExtendsDirective(typeNode, Kind.INTERFACE_TYPE_DEFINITION);
    },
    [Kind.UNION_TYPE_EXTENSION](typeNode) {
      return withExtendsDirective(typeNode, Kind.UNION_TYPE_DEFINITION);
    },
    [Kind.INPUT_OBJECT_TYPE_EXTENSION](typeNode) {
      return withExtendsDirective(typeNode, Kind.INPUT_OBJECT_TYPE_DEFINITION);
    },
    [Kind.ENUM_TYPE_EXTENSION](typeNode) {
      return withExtendsDirective(typeNode, Kind.ENUM_TYPE_DEFINITION);
    },
    [Kind.SCALAR_TYPE_EXTENSION](typeNode) {
      return withExtendsDirective(typeNode, Kind.SCALAR_TYPE_DEFINITION);
    },
  });

  const nonEmptyTypeNames = new Set<string>();
  for (const def of document.definitions) {
    if (
      (def.kind === Kind.OBJECT_TYPE_DEFINITION || def.kind === Kind.INTERFACE_TYPE_DEFINITION) &&
      def.fields?.length
    ) {
      nonEmptyTypeNames.add(def.name.value);
    }
  }

  return {
    ...document,
    definitions: document.definitions.filter(def => {
      if (
        (def.kind === Kind.OBJECT_TYPE_DEFINITION || def.kind === Kind.INTERFACE_TYPE_DEFINITION) &&
        !def.fields?.length &&
        nonEmptyTypeNames.has(def.name.value)
      ) {
        // Drop Apollo 2.15 empty stubs like `type Product` next to the real
        // `extend type Product` / `@extends` definition.
        return false;
      }
      return true;
    }),
  };
}

export const DEFAULT_INTROSPECTION_OPTIONS: Required<IntrospectionOptions> = {
  descriptions: true,
  specifiedByUrl: false,
  directiveIsRepeatable: false,
  experimentalDirectiveDeprecation: false,
  schemaDescription: false,
  inputValueDeprecation: true,
  oneOf: false,
  typeDepth: 7,
};

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

    introspectionOptions = DEFAULT_INTROSPECTION_OPTIONS,

    federation = false,

    transportKind = 'http',
  }: GraphQLSubgraphLoaderHTTPConfiguration,
): MeshComposeCLISourceHandlerDef {
  return (ctx: LoaderContext) => {
    let schema$: MaybePromise<GraphQLSchema>;
    const interpolationData = {
      env: globalThis.process?.env,
    };
    const interpolatedEndpoint = stringInterpolator.parse(endpoint, interpolationData);
    const interpolatedSource = stringInterpolator.parse(source, interpolationData);
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
    if (interpolatedSource) {
      schema$ = handleMaybePromise(
        () => {
          let source$: MaybePromise<string>;
          if (isUrl(interpolatedSource)) {
            source$ = handleMaybePromise(
              () =>
                ctx.fetch(interpolatedSource, {
                  headers: schemaHeaders,
                }),
              res => res.text(),
            );
          } else if (isValidPath(interpolatedSource)) {
            source$ = readFile(interpolatedSource, {
              allowUnknownExtensions: true,
              cwd: ctx.cwd,
              fetch: ctx.fetch,
              importFn: (p: string) => import(p),
              log: ctx.log,
            });
          }
          return source$;
        },
        sdl =>
          buildASTSchema(fixExtends(parse(sdl, { noLocation: true })), {
            assumeValidSDL: true,
            assumeValid: true,
          }),
      );
    } else {
      const fetchAsRegular = () =>
        handleMaybePromise(
          () =>
            ctx.fetch(interpolatedEndpoint, {
              method: method || (useGETForQueries ? 'GET' : 'POST'),
              headers: {
                'Content-Type': 'application/json',
                ...schemaHeaders,
              },
              body: JSON.stringify({
                query: getIntrospectionQuery(introspectionOptions),
              }),
            }),
          res => {
            assertResponseOk(res);
            return handleMaybePromise(
              () => res.json(),
              (result: ExecutionResult<IntrospectionQuery>) => {
                if (result.errors) {
                  throw new AggregateError(
                    result.errors.map(err => new GraphQLError(err.message, err)),
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
              },
            );
          },
        );
      const fetchAsFederation = () =>
        handleMaybePromise(
          () =>
            ctx.fetch(interpolatedEndpoint, {
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
            return handleMaybePromise(
              () => res.json(),
              (result: ExecutionResult) => {
                if (result.errors) {
                  throw new AggregateError(
                    result.errors.map(err => new GraphQLError(err.message, err)),
                    'Introspection Query Failed',
                  );
                }
                if (!result.data?._service?.sdl) {
                  throw new Error('Federation subgraph does not provide SDL');
                }
                // Replace "extend" keyword with "@extends"
                return buildASTSchema(
                  fixExtends(parse(result.data._service.sdl, { noLocation: true })),
                  {
                    assumeValidSDL: true,
                    assumeValid: true,
                  },
                );
              },
            );
          },
        );
      schema$ = federation ? fetchAsFederation() : fetchAsRegular();
    }
    schema$ = handleMaybePromise(() => schema$, handleFetchedSchema);
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
