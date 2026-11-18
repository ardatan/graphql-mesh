import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import type { SqlKind } from '@graphql-mesh/transport-sql';

/**
 * Arguments for the `@sql` field / object directive (hand-writable SDL or emitted schema).
 *
 * FIELD: Query / Mutation / relation resolvers.
 * OBJECT: type-level entity resolver (`$this` keys), Connectors-style.
 *
 * @example
 * ```graphql
 * type Query {
 *   albums(where: AlbumFilter, limit: Int): [Album!]!
 *     @sql(
 *       table: "albums"
 *       kind: ROWS
 *       where: "$args.where"
 *       limit: "$args.limit"
 *       selection: """
 *         id: AlbumId
 *         title: Title
 *         artistId: ArtistId
 *       """
 *     )
 * }
 * ```
 * @example
 * ```graphql
 * type Album {
 *   artist: Artist
 *     @sql(
 *       table: "artists"
 *       kind: ROW
 *       where: "ArtistId: $this.artistId"
 *       selection: "id: ArtistId\nname: Name"
 *     )
 * }
 * ```
 * @example
 * ```graphql
 * # Many-to-many via junction
 * type Playlist {
 *   tracks: [Track!]!
 *     @sql(
 *       table: "tracks"
 *       kind: ROWS
 *       through: """
 *         table: playlist_track
 *         local: PlaylistId
 *         remote: TrackId
 *         parent: $this.id
 *         target: TrackId
 *       """
 *       selection: "id: TrackId\nname: Name"
 *     )
 * }
 * ```
 */
export interface SqlDirectiveArgs {
  /**
   * Owning subgraph name when composing federated schemas (optional locally).
   *
   * @example 'shop'
   */
  subgraph?: string;
  /**
   * Physical SQL table (or view) this field/object maps to.
   *
   * @example 'albums'
   */
  table: string;
  /**
   * Operation shape: reads (`ROW`/`ROWS`/`CONNECTION`/`COUNT`) or writes
   * (`INSERT`/`UPDATE`/`DELETE`). Relations use `ROW`/`ROWS` with `$this`.
   *
   * @example 'ROWS'
   * @example 'INSERT'
   */
  kind: SqlKind;
  /**
   * Equality / join predicates and/or structured client filter binders.
   * Fixed keys are SQL columns; `$args.*` / `$this.*` resolve at runtime;
   * `...$args.where` spreads a client `*Filter` object.
   *
   * @example 'ArtistId: $this.id'
   * @example '$args.where'
   * @example 'ArtistId: $this.id\n...$args.where'
   */
  where?: string;
  /**
   * Order-by binder (typically `$args.orderBy`).
   *
   * @example '$args.orderBy'
   */
  orderBy?: string;
  /**
   * Limit binder (typically `$args.limit`).
   *
   * @example '$args.limit'
   */
  limit?: string;
  /**
   * Offset binder (typically `$args.offset`). Prefer keyset `after` for CONNECTION.
   *
   * @example '$args.offset'
   */
  offset?: string;
  /**
   * CONNECTION page size binder (typically `$args.first`).
   *
   * @example '$args.first'
   */
  first?: string;
  /**
   * CONNECTION keyset cursor binder (typically `$args.after`).
   *
   * @example '$args.after'
   */
  after?: string;
  /**
   * Column values for INSERT / UPDATE (`SQL_col: $args.input.field`).
   *
   * @example 'Title: $args.input.title\nArtistId: $args.input.artistId'
   */
  set?: string;
  /**
   * GraphQL field → SQL column (or `$fn.schema.fn`) mapping. Nested blocks wrap
   * CONNECTION / mutation payloads.
   *
   * @example 'id: AlbumId\ntitle: Title'
   * @example 'fullName: $fn.public.users_full_name'
   */
  selection?: string;
  /**
   * Many-to-many junction block: `table` / `local` / `remote` / `parent: $this…` / `target`.
   *
   * @example
   * ```
   * table: playlist_track
   * local: PlaylistId
   * remote: TrackId
   * parent: $this.id
   * target: TrackId
   * ```
   */
  through?: string;
}

/**
 * Single kind enum for `@sql` (reads, writes, and relation fields via `$this`).
 */
export const SqlKindEnum = new GraphQLEnumType({
  name: 'SqlKind',
  values: {
    ROW: {
      value: 'ROW',
      description: 'Single row (belongs-to / find-one).',
    },
    ROWS: {
      value: 'ROWS',
      description: 'List of rows (has-many / find-many).',
    },
    CONNECTION: {
      value: 'CONNECTION',
      description: 'Relay-style connection with keyset cursors.',
    },
    COUNT: {
      value: 'COUNT',
      description: 'Aggregate count of matching rows.',
    },
    INSERT: { value: 'INSERT', description: 'Insert one row.' },
    UPDATE: { value: 'UPDATE', description: 'Update matching rows.' },
    DELETE: { value: 'DELETE', description: 'Delete (or soft-delete) matching rows.' },
  },
});

/** @deprecated use SqlKindEnum */
export const SqlQueryKindEnum = SqlKindEnum;
/** @deprecated use SqlKindEnum */
export const SqlMutationKindEnum = SqlKindEnum;

/**
 * Mesh SQL mapping directive — see {@link SqlDirectiveArgs}.
 */
export const SqlDirective = new GraphQLDirective({
  name: 'sql',
  description:
    'Map a GraphQL field or object type to a SQL table. Use `$args` / `$this` binders in where/set/selection; optional `through` for M2M junctions.',
  // FIELD: Query/Mutation/relations. OBJECT: type-level entity resolver (`$this` keys),
  // same pattern as Connectors type-level `@connect`.
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
  args: {
    subgraph: {
      type: GraphQLString,
      description: 'Owning subgraph name when composing federated schemas.',
    },
    table: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'Physical SQL table or view.',
    },
    kind: {
      type: new GraphQLNonNull(SqlKindEnum),
      description: 'ROW | ROWS | CONNECTION | COUNT | INSERT | UPDATE | DELETE.',
    },
    where: {
      type: GraphQLString,
      description:
        'Equality/join predicates and structured filters (`ArtistId: $this.id`, `$args.where`, `...$args.where`).',
    },
    orderBy: {
      type: GraphQLString,
      description: 'Order-by binder, e.g. `$args.orderBy`.',
    },
    limit: {
      type: GraphQLString,
      description: 'Limit binder, e.g. `$args.limit`.',
    },
    offset: {
      type: GraphQLString,
      description: 'Offset binder, e.g. `$args.offset`.',
    },
    first: {
      type: GraphQLString,
      description: 'CONNECTION page size, e.g. `$args.first`.',
    },
    after: {
      type: GraphQLString,
      description: 'CONNECTION keyset cursor, e.g. `$args.after`.',
    },
    set: {
      type: GraphQLString,
      description: 'INSERT/UPDATE column values, e.g. `Title: $args.input.title`.',
    },
    selection: {
      type: GraphQLString,
      description:
        'GraphQL field → SQL column / `$fn…` mapping (and nested CONNECTION/payload wrappers).',
    },
    through: {
      type: GraphQLString,
      description:
        'Many-to-many junction block: `table` / `local` / `remote` / `parent: $this…` / `target`.',
    },
  },
});

/** @deprecated use SqlDirective */
export const SqlQueryDirective = SqlDirective;
/** @deprecated use SqlDirective */
export const SqlMutationDirective = SqlDirective;
/** @deprecated relations also use `@sql` */
export const SqlRelationDirective = SqlDirective;

export { TransportDirective } from '@graphql-mesh/utils';
