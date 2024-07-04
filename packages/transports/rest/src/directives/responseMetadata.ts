import type { GraphQLField } from 'graphql';

export function processResponseMetadataAnnotations(field: GraphQLField<any, any>) {
  field.resolve = function responseMetadataResolver(root) {
    return {
      url: root.$url,
      headers: root.$response.header,
      method: root.$method,
      status: root.$statusCode,
      statusText: root.$statusText,
      body: root.$response.body,
    };
  };
}
