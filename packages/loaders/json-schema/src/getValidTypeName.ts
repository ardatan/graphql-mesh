import type { SchemaComposer } from 'graphql-compose';
import { sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { inspect } from '@graphql-tools/utils';
import type { JSONSchemaObject } from '@json-schema-tools/meta-schema';

export function getValidTypeName({
  schemaComposer,
  isInput,
  subSchema,
}: {
  schemaComposer: SchemaComposer;
  isInput: boolean;
  subSchema: JSONSchemaObject;
}): string {
  if (!subSchema.title) {
    throw new Error('Missing title for schema; ' + inspect(subSchema));
  }
  const sanitizedName = sanitizeNameForGraphQL(
    isInput ? subSchema.title + '_Input' : subSchema.title,
  );
  if (schemaComposer.has(sanitizedName)) {
    let i = 2;
    while (schemaComposer.has(sanitizedName + i)) {
      i++;
    }
    return sanitizedName + i;
  }
  return sanitizedName;
}
