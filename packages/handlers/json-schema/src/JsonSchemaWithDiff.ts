import { ProxyOptions, PredefinedProxyOptions } from '@graphql-mesh/store';
import { JSONSchema } from '@json-schema-tools/meta-schema';
import { compareJSONSchemas } from './utils/compareJSONSchemas';

export const JsonSchemaWithDiff: ProxyOptions<JSONSchema> = {
  ...PredefinedProxyOptions.JsonWithoutValidation,
  validate: compareJSONSchemas,
};
