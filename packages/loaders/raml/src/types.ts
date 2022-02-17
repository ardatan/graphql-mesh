import { JSONSchemaLoaderOptions } from '@omnigraph/json-schema';

export interface RAMLLoaderOptions extends Partial<JSONSchemaLoaderOptions> {
  ramlFilePath: string;
  selectQueryOrMutationField?: RAMLLoaderSelectQueryOrMutationFieldConfig[];
}

export interface RAMLLoaderSelectQueryOrMutationFieldConfig {
  type: 'query' | 'mutation';
  fieldName: string;
}
