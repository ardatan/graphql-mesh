import type { JSONSchemaLoaderOptions } from '@omnigraph/json-schema';

export interface RAMLLoaderOptions extends Partial<JSONSchemaLoaderOptions> {
  source: string;
  selectQueryOrMutationField?: SelectQueryOrMutationFieldConfig[];
}

export interface SelectQueryOrMutationFieldConfig {
  type: 'query' | 'mutation' | 'Query' | 'Mutation';
  fieldName: string;
}
