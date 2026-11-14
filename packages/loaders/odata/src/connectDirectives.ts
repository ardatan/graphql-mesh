import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';

export {
  CONNECT_LINK_URL,
  ConnectDirective,
  FEDERATION_LINK_URL,
  LinkDirective,
  SourceDirective,
} from '@graphql-mesh/transport-rest';

/**
 * Federation `@key` — do **not** `addDirective` this onto the subgraph schema.
 * Guild composition imports the real def via `@link(url: federation, import: ["@key"])`;
 * a local def conflicts (`There can be only one directive named "@key"`) and must use
 * `resolvable: Boolean! = true` per the federation spec.
 * We only emit `@key(...)` *usages* on entity types.
 */
export const KeyDirective = new GraphQLDirective({
  name: 'key',
  locations: [DirectiveLocation.OBJECT, DirectiveLocation.INTERFACE],
  args: {
    fields: { type: new GraphQLNonNull(GraphQLString) },
    resolvable: { type: GraphQLBoolean, defaultValue: true },
  },
  isRepeatable: true,
});

/**
 * `minimal` — TripPin’s `/Trips` nav returns 500 with `odata.metadata=full`.
 * Hive synthesizes `_odataId` from the request URL when `@odata.id` is omitted.
 */
export const ODATA_ACCEPT_METADATA = 'application/json;odata.metadata=minimal';

/**
 * Connectors `http.queryParams` for Mesh `queryOptions`.
 * Object-literal form with quoted `$…` keys (same pattern as OpenAPI
 * `buildQueryParamsSelection`) — line-style `$filter: …` is not valid
 * JSONSelection for Apollo Router (`$` is path root).
 */
export const ODATA_QUERY_OPTIONS_QUERY_PARAMS = `{
  "$filter": $args.queryOptions.filter
  "$orderby": $args.queryOptions.orderby
  "$top": $args.queryOptions.top
  "$skip": $args.queryOptions.skip
  "$search": $args.queryOptions.search
  "$count": $args.queryOptions.count
  "$inlinecount": $args.queryOptions.inlinecount
}`;

export const ODATA_ERROR_MAPPING = {
  message: 'error.message',
};
