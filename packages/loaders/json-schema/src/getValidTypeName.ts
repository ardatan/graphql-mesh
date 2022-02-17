import { sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { JSONSchemaObject } from '@json-schema-tools/meta-schema';
import { SchemaComposer } from 'graphql-compose';

export function getValidTypeName({
  schemaComposer,
  isInput,
  subSchema,
}: {
  schemaComposer: SchemaComposer;
  isInput: boolean;
  subSchema: JSONSchemaObject;
}): string {
  const sanitizedName = sanitizeNameForGraphQL(isInput ? subSchema.title + '_Input' : subSchema.title);
  if (schemaComposer.has(sanitizedName)) {
    let i = 2;
    while (schemaComposer.has(sanitizedName + i)) {
      i++;
    }
    return sanitizedName + i;
  }
  return sanitizedName;
}
