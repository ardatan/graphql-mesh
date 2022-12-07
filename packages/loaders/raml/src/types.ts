import { JSONSchemaLoaderOptions } from '@omnigraph/json-schema';

export interface RAMLLoaderOptions extends Partial<JSONSchemaLoaderOptions> {
  source: string;
  selectQueryOrMutationField?: RAMLLoaderSelectQueryOrMutationFieldConfig[];
}

export interface RAMLLoaderSelectQueryOrMutationFieldConfig {
  type: 'query' | 'mutation' | 'Query' | 'Mutation';
  fieldName: string;
}
