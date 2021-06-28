import { ProxyOptions, PredefinedProxyOptions } from '@graphql-mesh/store';
import { JSONSchemaObject } from '@json-schema-tools/meta-schema';
import { compareJSONSchemas } from './utils/compareJSONSchemas';

export const JsonSchemaWithDiff: ProxyOptions<JSONSchemaObject> = {
  ...PredefinedProxyOptions.JsonWithoutValidation,
  validate: compareJSONSchemas,
};
