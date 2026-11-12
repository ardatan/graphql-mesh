import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLString,
} from 'graphql';

/**
 * Kind-specific transport config bag (REST qs/timeout, gRPC ssl, Neo4j auth, …).
 * Matches Hive `TransportEntry.options`.
 */
export const TransportOptionsScalar = new GraphQLScalarType({
  name: 'TransportOptions',
});

/**
 * Shared Mesh `@transport` directive — same shape for every loader/transport.
 *
 * Top-level args mirror Hive `TransportEntry` (`kind`, `subgraph`, `location`,
 * `headers`). Kind-specific fields belong in `options`, not as sibling args.
 */
export const TransportDirective = new GraphQLDirective({
  name: 'transport',
  isRepeatable: true,
  locations: [DirectiveLocation.SCHEMA],
  args: {
    subgraph: { type: new GraphQLNonNull(GraphQLString) },
    kind: { type: new GraphQLNonNull(GraphQLString) },
    location: { type: GraphQLString },
    // List-of-pairs matches `TransportEntry.headers`; ObjMap consumers still work
    // via schema.extensions / JSON round-trip in many loaders.
    headers: { type: new GraphQLList(new GraphQLList(GraphQLString)) },
    options: { type: TransportOptionsScalar },
  },
});

/** SDL form for typeDefs that cannot import the GraphQLDirective instance. */
export const TRANSPORT_DIRECTIVE_SDL = /* GraphQL */ `
  scalar TransportOptions
  directive @transport(
    subgraph: String!
    kind: String!
    location: String
    headers: [[String]]
    options: TransportOptions
  ) repeatable on SCHEMA
`;

export type TransportDirectiveArgs<Options extends Record<string, unknown> = Record<string, any>> =
  {
    subgraph: string;
    kind: string;
    location?: string;
    headers?: [string, string][] | Record<string, string>;
    options?: Options;
  };

/** REST-specific `@transport(options:)` fields. */
export type RESTTransportDirectiveOptions = {
  timeout?: number;
  queryParams?: Record<string, string>;
  queryStringOptions?: Record<string, any>;
};

/**
 * Read kind-specific options from a `@transport` usage, accepting the legacy
 * flat REST args (`queryStringOptions` / `queryParams` / `timeout` on the
 * directive itself) for older supergraphs.
 */
export function getTransportOptions<Options extends Record<string, any> = Record<string, any>>(
  transport:
    | (Partial<TransportDirectiveArgs<Options>> & Record<string, unknown>)
    | null
    | undefined,
): Options {
  if (!transport) {
    return {} as Options;
  }
  const nested = (transport.options || {}) as Options;
  const legacy = transport as Partial<TransportDirectiveArgs<Options>> & {
    queryStringOptions?: unknown;
    queryParams?: unknown;
    timeout?: unknown;
  };
  return {
    ...nested,
    ...(legacy.queryStringOptions != null && (nested as any).queryStringOptions == null
      ? { queryStringOptions: legacy.queryStringOptions }
      : {}),
    ...(legacy.queryParams != null && (nested as any).queryParams == null
      ? { queryParams: legacy.queryParams }
      : {}),
    ...(legacy.timeout != null && (nested as any).timeout == null
      ? { timeout: legacy.timeout }
      : {}),
  } as Options;
}
