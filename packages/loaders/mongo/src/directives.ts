import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

/**
 * Single kind enum for `@mongo` (reads, writes, aggregates).
 */
export const MongoKindEnum = new GraphQLEnumType({
  name: 'MongoKind',
  values: {
    FIND_ONE: { value: 'FIND_ONE' },
    FIND_MANY: { value: 'FIND_MANY' },
    COUNT: { value: 'COUNT' },
    CONNECTION: { value: 'CONNECTION' },
    PAGINATION: { value: 'PAGINATION' },
    AGGREGATE: { value: 'AGGREGATE' },
    INSERT_ONE: { value: 'INSERT_ONE' },
    INSERT_MANY: { value: 'INSERT_MANY' },
    UPDATE_ONE: { value: 'UPDATE_ONE' },
    UPDATE_MANY: { value: 'UPDATE_MANY' },
    DELETE_ONE: { value: 'DELETE_ONE' },
    DELETE_MANY: { value: 'DELETE_MANY' },
  },
});

export const MongoDirective = new GraphQLDirective({
  name: 'mongo',
  // FIELD: Query/Mutation/nested. OBJECT: type-level entity resolver (`$this` keys).
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
  args: {
    subgraph: { type: GraphQLString },
    collection: { type: new GraphQLNonNull(GraphQLString) },
    kind: { type: new GraphQLNonNull(MongoKindEnum) },
    /**
     * MongoDB query binder (`$args.query`, `_id: $args.id`, …) — findOne's
     * first argument. Maps to a typed `*QueryInput` or a native filter doc.
     */
    query: { type: GraphQLString },
    /** @deprecated use `query` */
    filter: { type: GraphQLString },
    /** MongoDB sort binder (`$args.sort`). */
    sort: { type: GraphQLString },
    /** Limit binder (`$args.limit`). */
    limit: { type: GraphQLString },
    /** Skip binder (`$args.skip`). */
    skip: { type: GraphQLString },
    /** CONNECTION page size (`$args.first`). */
    first: { type: GraphQLString },
    /** CONNECTION cursor (`$args.after`). */
    after: { type: GraphQLString },
    /** PAGINATION page (`$args.page`). */
    page: { type: GraphQLString },
    /** PAGINATION page size (`$args.perPage`). */
    perPage: { type: GraphQLString },
    /** Document values for INSERT, or update doc binder for UPDATE (`$args.update`). */
    set: { type: GraphQLString },
    selection: { type: GraphQLString },
    /** Aggregate pipeline stages (JSON array string or mapping). */
    pipeline: { type: GraphQLString },
  },
});

export { TransportDirective } from '@graphql-mesh/utils';
