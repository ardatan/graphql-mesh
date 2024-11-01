// HTTP/network attributes
export {
  SEMATTRS_HTTP_CLIENT_IP,
  SEMATTRS_HTTP_HOST,
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_ROUTE,
  SEMATTRS_HTTP_SCHEME,
  SEMATTRS_HTTP_SERVER_NAME,
  SEMATTRS_HTTP_STATUS_CODE,
  SEMATTRS_HTTP_URL,
  SEMATTRS_HTTP_USER_AGENT,
  SEMATTRS_NET_HOST_NAME,
  ATTR_SERVICE_NAME,
} from '@opentelemetry/semantic-conventions';

// GraphQL-specific attributes
// Based on https://opentelemetry.io/docs/specs/semconv/attributes-registry/graphql/
export const SEMATTRS_GRAPHQL_DOCUMENT = 'graphql.document';
export const SEMATTRS_GRAPHQL_OPERATION_TYPE = 'graphql.operation.type';
export const SEMATTRS_GRAPHQL_OPERATION_NAME = 'graphql.operation.name';
export const SEMATTRS_GRAPHQL_ERROR_COUNT = 'graphql.error.count';

// Gateway-specific attributes
export const SEMATTRS_GATEWAY_UPSTREAM_SUBGRAPH_NAME = 'gateway.upstream.subgraph.name';
