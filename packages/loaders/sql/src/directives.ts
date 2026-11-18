import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

/**
 * Shared `@sql` fields present on every kind.
 *
 * GraphQL still accepts the full arg set on the directive; this TS shape is a
 * kind-discriminated view for hand-typed mappings / docs (narrow via `kind`).
 */
interface SqlDirectiveArgsBase {
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
   * GraphQL field → SQL column (or `$fn.schema.fn`) mapping. Nested blocks wrap
   * CONNECTION / mutation payloads.
   *
   * @example 'id: AlbumId\ntitle: Title'
   * @example 'fullName: $fn.public.users_full_name'
   */
  selection?: string;
}

/** Equality / join predicates and structured `$args.where` / `$this` binders. */
interface SqlDirectiveWhere {
  /**
   * Fixed keys are SQL columns; `$args.*` / `$this.*` resolve at runtime;
   * `...$args.where` spreads a client `*Filter` object.
   *
   * @example 'ArtistId: $this.id'
   * @example '$args.where'
   * @example 'ArtistId: $this.id\n...$args.where'
   */
  where?: string;
}

/**
 * `kind: ROW` — find-one / belongs-to / type-level entity keys.
 *
 * @example
 * ```graphql
 * artist: Artist
 *   @sql(
 *     table: "artists"
 *     kind: ROW
 *     where: "ArtistId: $this.artistId"
 *     selection: "id: ArtistId\nname: Name"
 *   )
 * ```
 */
export interface SqlDirectiveRowArgs extends SqlDirectiveArgsBase, SqlDirectiveWhere {
  kind: 'ROW';
}

/**
 * `kind: ROWS` — find-many / has-many (optional M2M `through`).
 *
 * @example
 * ```graphql
 * albums(where: AlbumFilter, limit: Int): [Album!]!
 *   @sql(
 *     table: "albums"
 *     kind: ROWS
 *     where: "$args.where"
 *     orderBy: "$args.orderBy"
 *     limit: "$args.limit"
 *     selection: "id: AlbumId\ntitle: Title"
 *   )
 * ```
 */
export interface SqlDirectiveRowsArgs extends SqlDirectiveArgsBase, SqlDirectiveWhere {
  kind: 'ROWS';
  /**
   * Order-by binder.
   *
   * @example '$args.orderBy'
   */
  orderBy?: string;
  /**
   * Limit binder.
   *
   * @example '$args.limit'
   */
  limit?: string;
  /**
   * Offset binder.
   *
   * @example '$args.offset'
   */
  offset?: string;
  /**
   * Many-to-many junction: `table` / `local` / `remote` / `parent: $this…` / `target`.
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
 * `kind: CONNECTION` — Relay connection with keyset cursors (`first` / `after`).
 *
 * @example
 * ```graphql
 * allAlbums(where: AlbumFilter, first: Int, after: String): AlbumConnection!
 *   @sql(
 *     table: "albums"
 *     kind: CONNECTION
 *     where: "$args.where"
 *     orderBy: "$args.orderBy"
 *     first: "$args.first"
 *     after: "$args.after"
 *     selection: """
 *       nodes { id: AlbumId title: Title }
 *       edges { cursor: $cursor node { id: AlbumId title: Title } }
 *       pageInfo { hasNextPage endCursor: $cursor }
 *     """
 *   )
 * ```
 */
export interface SqlDirectiveConnectionArgs extends SqlDirectiveArgsBase, SqlDirectiveWhere {
  kind: 'CONNECTION';
  /**
   * Order-by binder (drives keyset cursor columns).
   *
   * @example '$args.orderBy'
   */
  orderBy?: string;
  /**
   * Page size binder.
   *
   * @example '$args.first'
   */
  first?: string;
  /**
   * Keyset cursor binder.
   *
   * @example '$args.after'
   */
  after?: string;
}

/**
 * `kind: COUNT` — aggregate count of matching rows.
 *
 * @example
 * ```graphql
 * albumsCount(where: AlbumFilter): Int!
 *   @sql(table: "albums", kind: COUNT, where: "$args.where")
 * ```
 */
export interface SqlDirectiveCountArgs extends SqlDirectiveArgsBase, SqlDirectiveWhere {
  kind: 'COUNT';
}

/**
 * `kind: INSERT` — create; column values via `set`.
 *
 * @example
 * ```graphql
 * createAlbum(input: CreateAlbumInput!): AlbumPayload!
 *   @sql(
 *     table: "albums"
 *     kind: INSERT
 *     set: "Title: $args.input.title\nArtistId: $args.input.artistId"
 *     selection: "album { id: AlbumId title: Title }"
 *   )
 * ```
 */
export interface SqlDirectiveInsertArgs extends SqlDirectiveArgsBase {
  kind: 'INSERT';
  /**
   * Column values (`SQL_col: $args.input.field`).
   *
   * @example 'Title: $args.input.title\nArtistId: $args.input.artistId'
   */
  set?: string;
}

/**
 * `kind: UPDATE` — update matching rows; requires `set` + usually `where`.
 *
 * @example
 * ```graphql
 * updateAlbum(input: UpdateAlbumInput!, where: AlbumFilter!): AlbumPayload!
 *   @sql(
 *     table: "albums"
 *     kind: UPDATE
 *     set: "Title: $args.input.title"
 *     where: "$args.where"
 *     selection: "album { id: AlbumId title: Title }"
 *   )
 * ```
 */
export interface SqlDirectiveUpdateArgs extends SqlDirectiveArgsBase, SqlDirectiveWhere {
  kind: 'UPDATE';
  /**
   * Column values (`SQL_col: $args.input.field`).
   *
   * @example 'Title: $args.input.title'
   */
  set?: string;
}

/**
 * `kind: DELETE` — hard or soft delete of matching rows.
 *
 * @example
 * ```graphql
 * deleteAlbum(where: AlbumFilter!): DeleteAlbumPayload!
 *   @sql(table: "albums", kind: DELETE, where: "$args.where")
 * ```
 */
export interface SqlDirectiveDeleteArgs extends SqlDirectiveArgsBase, SqlDirectiveWhere {
  kind: 'DELETE';
}

/**
 * Arguments for the `@sql` field / object directive, discriminated on {@link SqlDirectiveArgs.kind}.
 *
 * Narrow with `kind` so CONNECTION-only (`first` / `after`), ROWS-only (`limit` /
 * `offset` / `through`), and write-only (`set`) fields type-check correctly.
 * The GraphQL directive definition still lists every arg for SDL flexibility.
 *
 * FIELD: Query / Mutation / relation resolvers.
 * OBJECT: type-level entity resolver (`$this` keys), Connectors-style.
 *
 * @example
 * ```ts
 * const rows: SqlDirectiveArgs = {
 *   table: 'albums',
 *   kind: 'ROWS',
 *   where: '$args.where',
 *   limit: '$args.limit',
 *   selection: 'id: AlbumId\ntitle: Title',
 * };
 * ```
 * @example
 * ```ts
 * const conn: SqlDirectiveArgs = {
 *   table: 'albums',
 *   kind: 'CONNECTION',
 *   where: '$args.where',
 *   first: '$args.first',
 *   after: '$args.after',
 * };
 * ```
 */
export type SqlDirectiveArgs =
  | SqlDirectiveRowArgs
  | SqlDirectiveRowsArgs
  | SqlDirectiveConnectionArgs
  | SqlDirectiveCountArgs
  | SqlDirectiveInsertArgs
  | SqlDirectiveUpdateArgs
  | SqlDirectiveDeleteArgs;

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
