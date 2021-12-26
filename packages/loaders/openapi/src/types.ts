import { JSONSchemaLoaderOptions } from '@omnigraph/json-schema';

export interface OpenAPILoaderOptions extends Partial<JSONSchemaLoaderOptions> {
  // The URL or FileSystem path to the RAML API Document.
  oasFilePath: string;
}
