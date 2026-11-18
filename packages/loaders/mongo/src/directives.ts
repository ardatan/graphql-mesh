import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

const subgraphArg = { type: GraphQLString };
const collectionArg = { type: new GraphQLNonNull(GraphQLString) };
const selectionArg = { type: GraphQLString };
const queryArg = { type: GraphQLString };
const sortArg = { type: GraphQLString };

/**
 * Op-specific `@mongo__*` directives (execution binders).
 *
 * Client GraphQL can differ from binder arg names: generated roots use
 * `filter: *FilterInput` while binders keep Mongo-style `query: "$args.filter"`.
 *
 * @example Generated findMany binder
 * ```graphql
 * findUsers(filter: UserFilterInput, sort: [UserSort!]): [User!]!
 *   @mongo__find(
 *     subgraph: "users"
 *     collection: "users"
 *     query: "$args.filter"
 *     sort: "$args.sort"
 *     selection: """
 *     id: $_id
 *     name
 *     """
 *   )
 * ```
 *
 * findOne(query, projection) → `@mongo__findOne(query, selection)`
 * find(query).sort().limit() → `@mongo__find(query, sort, limit, skip, selection)`
 */
export const MongoFindOneDirective = new GraphQLDirective({
  name: 'mongo__findOne',
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
  isRepeatable: true,
  args: {
    subgraph: subgraphArg,
    collection: collectionArg,
    /** Mongo filter binder (`$args.filter`, `_id: $args.id`, or a block merge). */
    query: queryArg,
    sort: sortArg,
    skip: { type: GraphQLString },
    selection: selectionArg,
  },
});

export const MongoFindDirective = new GraphQLDirective({
  name: 'mongo__find',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  isRepeatable: true,
  args: {
    subgraph: subgraphArg,
    collection: collectionArg,
    query: queryArg,
    sort: sortArg,
    limit: { type: GraphQLString },
    skip: { type: GraphQLString },
    selection: selectionArg,
  },
});

export const MongoCountDirective = new GraphQLDirective({
  name: 'mongo__count',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  isRepeatable: true,
  args: {
    subgraph: subgraphArg,
    collection: collectionArg,
    query: queryArg,
    selection: selectionArg,
  },
});

export const MongoConnectionDirective = new GraphQLDirective({
  name: 'mongo__connection',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  isRepeatable: true,
  args: {
    subgraph: subgraphArg,
    collection: collectionArg,
    query: queryArg,
    sort: sortArg,
    first: { type: GraphQLString },
    after: { type: GraphQLString },
    selection: selectionArg,
  },
});

export const MongoPaginationDirective = new GraphQLDirective({
  name: 'mongo__pagination',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  isRepeatable: true,
  args: {
    subgraph: subgraphArg,
    collection: collectionArg,
    query: queryArg,
    sort: sortArg,
    page: { type: GraphQLString },
    perPage: { type: GraphQLString },
    selection: selectionArg,
  },
});

export const MongoAggregateDirective = new GraphQLDirective({
  name: 'mongo__aggregate',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  isRepeatable: true,
  args: {
    subgraph: subgraphArg,
    collection: collectionArg,
    query: queryArg,
    pipeline: { type: GraphQLString },
    selection: selectionArg,
  },
});

export const MongoInsertOneDirective = new GraphQLDirective({
  name: 'mongo__insertOne',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  isRepeatable: true,
  args: {
    subgraph: subgraphArg,
    collection: collectionArg,
    /** Field map into the inserted document (`name: $args.document.name`). */
    set: { type: GraphQLString },
    selection: selectionArg,
  },
});

export const MongoInsertManyDirective = new GraphQLDirective({
  name: 'mongo__insertMany',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  isRepeatable: true,
  args: {
    subgraph: subgraphArg,
    collection: collectionArg,
    set: { type: GraphQLString },
    selection: selectionArg,
    /**
     * When true, each bulk document uses generated GraphQL DocumentInput aliases
     * (`id` → `_id`, `storedId` → `id`) for String-`_id` collections. Omit on
     * hand-written binders that already supply BSON field names.
     */
    graphqlDocumentInputs: { type: GraphQLBoolean },
  },
});

export const MongoUpdateOneDirective = new GraphQLDirective({
  name: 'mongo__updateOne',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  isRepeatable: true,
  args: {
    subgraph: subgraphArg,
    collection: collectionArg,
    query: queryArg,
    /** Update binder (`$args.update` with `set`/`inc`/… → `$set`/`$inc`/…). */
    set: { type: GraphQLString },
    selection: selectionArg,
  },
});

export const MongoUpdateManyDirective = new GraphQLDirective({
  name: 'mongo__updateMany',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  isRepeatable: true,
  args: {
    subgraph: subgraphArg,
    collection: collectionArg,
    query: queryArg,
    set: { type: GraphQLString },
    selection: selectionArg,
  },
});

export const MongoDeleteOneDirective = new GraphQLDirective({
  name: 'mongo__deleteOne',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  isRepeatable: true,
  args: {
    subgraph: subgraphArg,
    collection: collectionArg,
    query: queryArg,
    selection: selectionArg,
  },
});

export const MongoDeleteManyDirective = new GraphQLDirective({
  name: 'mongo__deleteMany',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  isRepeatable: true,
  args: {
    subgraph: subgraphArg,
    collection: collectionArg,
    query: queryArg,
    selection: selectionArg,
  },
});

/** All op-specific mongo directives for schema registration. */
export const MongoOpDirectives = [
  MongoFindOneDirective,
  MongoFindDirective,
  MongoCountDirective,
  MongoConnectionDirective,
  MongoPaginationDirective,
  MongoAggregateDirective,
  MongoInsertOneDirective,
  MongoInsertManyDirective,
  MongoUpdateOneDirective,
  MongoUpdateManyDirective,
  MongoDeleteOneDirective,
  MongoDeleteManyDirective,
] as const;

export const MONGO_DIRECTIVE_KIND: Record<string, string> = {
  mongo__findOne: 'FIND_ONE',
  mongo__find: 'FIND_MANY',
  mongo__count: 'COUNT',
  mongo__connection: 'CONNECTION',
  mongo__pagination: 'PAGINATION',
  mongo__aggregate: 'AGGREGATE',
  mongo__insertOne: 'INSERT_ONE',
  mongo__insertMany: 'INSERT_MANY',
  mongo__updateOne: 'UPDATE_ONE',
  mongo__updateMany: 'UPDATE_MANY',
  mongo__deleteOne: 'DELETE_ONE',
  mongo__deleteMany: 'DELETE_MANY',
};

export { TransportDirective } from '@graphql-mesh/utils';
