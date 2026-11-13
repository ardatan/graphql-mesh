import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLString,
} from 'graphql';

/** Opaque Connectors JSONSelection (same approach as @omnigraph/json-schema). */
const JSONSelectionScalar = new GraphQLScalarType({
  name: 'JSONSelection',
  serialize: String,
  parseValue: String,
  parseLiteral: ast => ('value' in ast ? String((ast as any).value) : null),
});

const HTTPHeaderMappingInput = new GraphQLInputObjectType({
  name: 'HTTPHeaderMapping',
  fields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    value: { type: GraphQLString },
    from: { type: GraphQLString },
  },
});

const ConnectHTTPInput = new GraphQLInputObjectType({
  name: 'ConnectHTTP',
  fields: {
    GET: { type: GraphQLString },
    HEAD: { type: GraphQLString },
    POST: { type: GraphQLString },
    PUT: { type: GraphQLString },
    PATCH: { type: GraphQLString },
    DELETE: { type: GraphQLString },
    headers: { type: new GraphQLList(new GraphQLNonNull(HTTPHeaderMappingInput)) },
    body: { type: JSONSelectionScalar },
    queryParams: { type: JSONSelectionScalar },
  },
});

const SourceHTTPInput = new GraphQLInputObjectType({
  name: 'SourceHTTP',
  fields: {
    baseURL: { type: new GraphQLNonNull(GraphQLString) },
    headers: { type: new GraphQLList(new GraphQLNonNull(HTTPHeaderMappingInput)) },
    queryParams: { type: JSONSelectionScalar },
  },
});

const ConnectorErrorsInput = new GraphQLInputObjectType({
  name: 'ConnectorErrors',
  fields: {
    message: { type: JSONSelectionScalar },
    extensions: { type: JSONSelectionScalar },
  },
});

export const ConnectDirective = new GraphQLDirective({
  name: 'connect',
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.OBJECT],
  args: {
    source: { type: GraphQLString },
    http: { type: ConnectHTTPInput },
    selection: { type: new GraphQLNonNull(JSONSelectionScalar) },
    entity: { type: GraphQLBoolean },
    errors: { type: ConnectorErrorsInput },
    isSuccess: { type: JSONSelectionScalar },
  },
  isRepeatable: true,
});

export const SourceDirective = new GraphQLDirective({
  name: 'source',
  locations: [DirectiveLocation.SCHEMA],
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    http: { type: new GraphQLNonNull(SourceHTTPInput) },
    errors: { type: ConnectorErrorsInput },
    isSuccess: { type: JSONSelectionScalar },
  },
  isRepeatable: true,
});

export const LinkDirective = new GraphQLDirective({
  name: 'link',
  locations: [DirectiveLocation.SCHEMA],
  args: {
    url: { type: new GraphQLNonNull(GraphQLString) },
    import: { type: new GraphQLList(GraphQLString) },
  },
  isRepeatable: true,
});

/** Federation `@key` — composition imports the real def via `@link`; we only emit usage. */
export const KeyDirective = new GraphQLDirective({
  name: 'key',
  locations: [DirectiveLocation.OBJECT, DirectiveLocation.INTERFACE],
  args: {
    fields: { type: new GraphQLNonNull(GraphQLString) },
    resolvable: { type: GraphQLBoolean },
  },
  isRepeatable: true,
});

export const CONNECT_LINK_URL = 'https://specs.apollo.dev/connect/v0.4';
export const FEDERATION_LINK_URL = 'https://specs.apollo.dev/federation/v2.3';

export const ODATA_ACCEPT_METADATA = 'application/json;odata.metadata=minimal';

export const ODATA_QUERY_OPTIONS_QUERY_PARAMS = `
$filter: $args.queryOptions.filter
$orderby: $args.queryOptions.orderby
$top: $args.queryOptions.top
$skip: $args.queryOptions.skip
$search: $args.queryOptions.search
$count: $args.queryOptions.count
$inlinecount: $args.queryOptions.inlinecount
`.trim();

export const ODATA_ERROR_MAPPING = {
  message: 'error.message',
};
