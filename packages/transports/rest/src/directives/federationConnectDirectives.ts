import {
  DirectiveLocation,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLString,
  Kind,
  type ValueNode,
} from 'graphql';

/**
 * Shared Federation Connectors `@connect` / `@source` / `@link` directive defs.
 * Used by `@omnigraph/json-schema` (OpenAPI/REST) and `@omnigraph/odata` so subgraph
 * emit does not duplicate Apollo Connectors v0.4 shapes.
 *
 * Arg types match https://specs.apollo.dev/connect/v0.4 (`JSONSelection`,
 * `URLPathTemplate`). Composition strips these linked scalars / inputs from the
 * finalized supergraph — Apollo’s `@link(url: connect/v0.4)` owns them for Router.
 */

function parseStringLiteral(ast: ValueNode): string | null {
  return ast.kind === Kind.STRING || ast.kind === Kind.ENUM ? String((ast as any).value) : null;
}

/** Connectors mapping language (opaque string). */
export const JSONSelectionScalar = new GraphQLScalarType({
  name: 'JSONSelection',
  description: 'A custom syntax for mapping JSON data to GraphQL schema',
  serialize: String,
  parseValue: String,
  parseLiteral: parseStringLiteral,
});

/** HTTP path / URL template with optional `{$args…}` / `{$this…}` interpolations. */
export const URLPathTemplateScalar = new GraphQLScalarType({
  name: 'URLPathTemplate',
  description: 'A URL path with optional parameters, mapping to GraphQL fields or arguments',
  serialize: String,
  parseValue: String,
  parseLiteral: parseStringLiteral,
});

export const HTTPHeaderMappingInput = new GraphQLInputObjectType({
  name: 'HTTPHeaderMapping',
  fields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    value: { type: GraphQLString },
    from: { type: GraphQLString },
  },
});

export const ConnectHTTPInput = new GraphQLInputObjectType({
  name: 'ConnectHTTP',
  fields: {
    GET: { type: URLPathTemplateScalar },
    HEAD: { type: URLPathTemplateScalar },
    POST: { type: URLPathTemplateScalar },
    PUT: { type: URLPathTemplateScalar },
    PATCH: { type: URLPathTemplateScalar },
    DELETE: { type: URLPathTemplateScalar },
    headers: { type: new GraphQLList(new GraphQLNonNull(HTTPHeaderMappingInput)) },
    body: { type: JSONSelectionScalar },
    queryParams: { type: JSONSelectionScalar },
  },
});

export const SourceHTTPInput = new GraphQLInputObjectType({
  name: 'SourceHTTP',
  fields: {
    baseURL: { type: new GraphQLNonNull(GraphQLString) },
    headers: { type: new GraphQLList(new GraphQLNonNull(HTTPHeaderMappingInput)) },
    queryParams: { type: JSONSelectionScalar },
  },
});

export const ConnectorErrorsInput = new GraphQLInputObjectType({
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

export const CONNECT_LINK_URL = 'https://specs.apollo.dev/connect/v0.4';
export const FEDERATION_LINK_URL = 'https://specs.apollo.dev/federation/v2.6';
