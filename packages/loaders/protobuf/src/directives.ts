import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

/**
 * Arguments for the `@protobuf__rpc` field / object directive (loader emit or hand-authored SDL).
 *
 * FIELD: Query / Mutation / Subscription / relation resolvers.
 * OBJECT: type-level entity resolver (`$this` binders).
 *
 * @example
 * ```graphql
 * type Query {
 *   moviesByYear(year: Int!): MoviesResult!
 *     @protobuf__rpc(
 *       service: "Example"
 *       method: "GetMovies"
 *       args: """
 *         1(message): $args {
 *           2(int64): $args.year
 *         }
 *       """
 *       selection: """
 *         1(repeated message): result {
 *           1(string): name
 *           2(int64): year
 *         }
 *       """
 *     )
 * }
 * ```
 * @example
 * ```graphql
 * # Type-level entity fill (`$this` keys)
 * type Movie @key(fields: "name") @protobuf__rpc(
 *   service: "Example"
 *   method: "GetMovie"
 *   args: """
 *     1(string): $this.name
 *   """
 *   selection: """
 *     1(string): name
 *     2(int64): year
 *   """
 * ) {
 *   name: String!
 *   year: Int
 * }
 * ```
 */
export interface ProtobufRpcDirectiveArgs {
  /**
   * Owning subgraph name when composing federated schemas (optional locally).
   *
   * @example 'movies'
   */
  subgraph?: string;
  /**
   * Protobuf service name (package-qualified or short, as emitted).
   *
   * @example 'movies.Movies'
   */
  service?: string;
  /**
   * RPC method name on the service.
   *
   * @example 'GetMovies'
   */
  method: string;
  /**
   * Compact GraphQL → protobuf request mapping (`id(protoType): $args...` / `$this...`).
   * Omit when the RPC takes an empty request (do not emit `args: ""`).
   *
   * @example '1(message): $args {\n  2(int64): $args.year\n}'
   */
  args?: string;
  /**
   * Compact protobuf response → GraphQL field mapping.
   *
   * @example '1(string): name\n2(int64): year'
   */
  selection: string;
  /**
   * When true, the field is a server-streaming RPC (Subscription `subscribe` or
   * Query/Mutation AsyncIterable for `@stream`).
   */
  stream?: boolean;
  /**
   * When true on a Query field, wire the return type's `resolveReference` for Mesh `_entities`.
   */
  entity?: boolean;
}

/** Mesh protobuf RPC mapping directive - see {@link ProtobufRpcDirectiveArgs}. */
export const protobufRpcDirective = new GraphQLDirective({
  name: 'protobuf__rpc',
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
  isRepeatable: true,
  args: {
    /** Owning subgraph name when composing federated schemas. */
    subgraph: { type: GraphQLString },
    /** Protobuf service name. */
    service: { type: GraphQLString },
    /** RPC method name on the service. */
    method: { type: new GraphQLNonNull(GraphQLString) },
    /** Compact GraphQL -> protobuf request mapping; omit when the request is empty. */
    args: { type: GraphQLString },
    /** Compact protobuf response -> GraphQL field mapping. */
    selection: { type: new GraphQLNonNull(GraphQLString) },
    /** Server-streaming RPC (Subscription or Query/Mutation AsyncIterable). */
    stream: { type: GraphQLBoolean },
    /** Mark this Query field as an entity resolver for Mesh `_entities`. */
    entity: { type: GraphQLBoolean },
  },
});

export { TransportDirective as transportDirective } from '@graphql-mesh/utils';
