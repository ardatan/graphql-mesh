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
     * Equality / join predicates plus Connectors-style spreads
     * (`_id: $this.id`, `...$args.where`).
     */
    where: { type: GraphQLString },
    /** Sort binder (`$args.sort`). */
    sort: { type: GraphQLString },
    /** Limit binder (`$args.limit`). */
    limit: { type: GraphQLString },
    /** Skip binder (`$args.skip`). */
    skip: { type: GraphQLString },
    /** CONNECTION page size (`$args.first`). */
    first: { type: GraphQLString },
    /** CONNECTION cursor (`$args.after`). */
    after: { type: GraphQLString },
    /** Document values for INSERT / UPDATE. */
    set: { type: GraphQLString },
    selection: { type: GraphQLString },
    /** Aggregate pipeline sketch (deferred runtime depth). */
    pipeline: { type: GraphQLString },
  },
});

export { TransportDirective } from '@graphql-mesh/utils';
