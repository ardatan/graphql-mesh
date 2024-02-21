import { compareJSONSchemas } from 'json-machete';
import { PredefinedProxyOptions, ProxyOptions } from '@graphql-mesh/store';
import { JSONSchemaObject } from '@json-schema-tools/meta-schema';

export const JsonSchemaWithDiff: ProxyOptions<JSONSchemaObject> = {
  ...PredefinedProxyOptions.JsonWithoutValidation,
  validate: compareJSONSchemas,
};
