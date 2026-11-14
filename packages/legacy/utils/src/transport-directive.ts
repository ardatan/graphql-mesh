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

/** OData-only knobs nested under `@transport(options: { odata: … })`. */
export type ODataTransportOptions = {
  /** Coalesce sibling Connectors HTTP into `POST /$batch`. */
  batch?: 'none' | 'json' | 'multipart';
  /** Prefer parent `$expand` payloads over per-nav HTTP round-trips. */
  expandNavProps?: boolean;
};

/** REST-specific `@transport(options:)` fields. */
export type RESTTransportDirectiveOptions = {
  timeout?: number;
  queryParams?: Record<string, string>;
  queryStringOptions?: Record<string, any>;
  /** Present when the subgraph was loaded from OData. */
  odata?: ODataTransportOptions;
};

/** Read kind-specific options from `@transport(options:)`. */
export function getTransportOptions<Options extends Record<string, any> = Record<string, any>>(
  transport: Partial<TransportDirectiveArgs<Options>> | null | undefined,
): Options {
  return (transport?.options || {}) as Options;
}
