import type { JSONSchemaLoaderOptions } from '@omnigraph/json-schema';

export interface OpenAPILoaderOptions extends Partial<JSONSchemaLoaderOptions> {
  // The URL or FileSystem path to the OpenAPI Document.
  source: string;
  selectQueryOrMutationField?: OpenAPILoaderSelectQueryOrMutationFieldConfig[];
  fallbackFormat?: 'json' | 'yaml' | 'js' | 'ts';
  jsonApi?: boolean;
}

export interface OpenAPILoaderSelectQueryOrMutationFieldConfig {
  type: 'query' | 'mutation' | 'Query' | 'Mutation';
  fieldName: string;
}
