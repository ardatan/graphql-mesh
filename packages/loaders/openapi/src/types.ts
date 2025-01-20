import type { JSONSchemaLoaderOptions } from '@omnigraph/json-schema';
import type { HATEOASConfig } from './getJSONSchemaOptionsFromOpenAPIOptions.js';

export interface OpenAPILoaderOptions extends Partial<JSONSchemaLoaderOptions> {
  // The URL or FileSystem path to the OpenAPI Document.
  source: string;
  selectQueryOrMutationField?: SelectQueryOrMutationFieldConfig[];
  fallbackFormat?: 'json' | 'yaml' | 'js' | 'ts';
  jsonApi?: boolean;
  HATEOAS?: HATEOASConfig | boolean;
}

export interface SelectQueryOrMutationFieldConfig {
  type: 'query' | 'mutation' | 'Query' | 'Mutation';
  fieldName: string;
}
