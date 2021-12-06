import { JSONSchemaLoaderOptions } from '@omnigraph/json-schema';

export interface RAMLLoaderOptions extends Partial<JSONSchemaLoaderOptions> {
  ramlFilePath: string;
}
