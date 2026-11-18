import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

/**
 * Single kind enum for `@sql` (reads, writes, and relation fields via `$this`).
 */
export const SqlKindEnum = new GraphQLEnumType({
  name: 'SqlKind',
  values: {
    ROW: { value: 'ROW' },
    ROWS: { value: 'ROWS' },
    CONNECTION: { value: 'CONNECTION' },
    COUNT: { value: 'COUNT' },
    INSERT: { value: 'INSERT' },
    UPDATE: { value: 'UPDATE' },
    DELETE: { value: 'DELETE' },
  },
});

/** @deprecated use SqlKindEnum */
export const SqlQueryKindEnum = SqlKindEnum;
/** @deprecated use SqlKindEnum */
export const SqlMutationKindEnum = SqlKindEnum;

export const SqlDirective = new GraphQLDirective({
  name: 'sql',
  // FIELD: Query/Mutation/relations. OBJECT: type-level entity resolver (`$this` keys),
  // same pattern as Connectors type-level `@connect`.
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
  args: {
    subgraph: { type: GraphQLString },
    table: { type: new GraphQLNonNull(GraphQLString) },
    kind: { type: new GraphQLNonNull(SqlKindEnum) },
    /**
     * Equality / join predicates plus Connectors-style spreads
     * (`ArtistId: $this.id`, `...$args.where`).
     */
    where: { type: GraphQLString },
    /** Order-by binder (`$args.orderBy`). */
    orderBy: { type: GraphQLString },
    /** Limit binder (`$args.limit`). */
    limit: { type: GraphQLString },
    /** Offset binder (`$args.offset`). */
    offset: { type: GraphQLString },
    /** CONNECTION page size (`$args.first`). */
    first: { type: GraphQLString },
    /** CONNECTION cursor (`$args.after`). */
    after: { type: GraphQLString },
    /** Column values for INSERT / UPDATE (`Title: $args.input.title`). */
    set: { type: GraphQLString },
    selection: { type: GraphQLString },
    /**
     * Many-to-many junction (PostGraphile-style shortcut):
     * `table` / `local` / `remote` / `parent: $this.id` / `target`.
     */
    through: { type: GraphQLString },
  },
});

/** @deprecated use SqlDirective */
export const SqlQueryDirective = SqlDirective;
/** @deprecated use SqlDirective */
export const SqlMutationDirective = SqlDirective;
/** @deprecated relations also use `@sql` */
export const SqlRelationDirective = SqlDirective;

export { TransportDirective } from '@graphql-mesh/utils';
