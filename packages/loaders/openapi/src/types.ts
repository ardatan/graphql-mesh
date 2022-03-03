import { JSONSchemaLoaderOptions } from '@omnigraph/json-schema';

export interface OpenAPILoaderOptions extends Partial<JSONSchemaLoaderOptions> {
  // The URL or FileSystem path to the OpenAPI Document.
  oasFilePath: string;
  selectQueryOrMutationField?: OpenAPILoaderSelectQueryOrMutationFieldConfig[];
}

export interface OpenAPILoaderSelectQueryOrMutationFieldConfig {
  type: 'query' | 'mutation';
  fieldName: string;
}
