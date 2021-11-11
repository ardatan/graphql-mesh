import { inspect } from 'util';
import { JSONSchema } from './types';
import { OnCircularReference, visitJSONSchema } from './visitJSONSchema';

const reservedTypeNames = ['Query', 'Mutation', 'Subscription'];

function deduplicateJSONSchema(schema: JSONSchema, seenMap = new Map()) {
  if (typeof schema === 'object' && schema != null) {
    const stringified = inspect(schema, undefined, 3);
    const seen = seenMap.get(stringified);
    if (seen) {
      return seen;
    }
    seenMap.set(stringified, schema);
    for (const key in schema) {
      schema[key] = deduplicateJSONSchema(schema[key], seenMap);
    }
  }
  return schema;
}
async function getDeduplicatedTitles(schema: JSONSchema): Promise<Set<string>> {
  const duplicatedTypeNames = new Set<string>();
  const seenTypeNames = new Set<string>();
  await visitJSONSchema(
    schema,
    subSchema => {
      if (typeof subSchema === 'object' && subSchema.title) {
        if (seenTypeNames.has(subSchema.title)) {
          duplicatedTypeNames.add(subSchema.title);
        } else {
          seenTypeNames.add(subSchema.title);
        }
      }
      return subSchema;
    },
    {
      visitedSubschemaResultMap: new WeakMap(),
      path: '',
      keepObjectRef: true,
      onCircularReference: OnCircularReference.IGNORE,
    }
  );
  return duplicatedTypeNames;
}
export async function healJSONSchema(schema: JSONSchema) {
  const deduplicatedSchema = deduplicateJSONSchema(schema);
  const duplicatedTypeNames = await getDeduplicatedTitles(deduplicatedSchema);
  return visitJSONSchema<JSONSchema>(
    deduplicatedSchema,
    (subSchema, { path }) => {
      if (typeof subSchema === 'object') {
        if (duplicatedTypeNames.has(subSchema.title)) {
          delete subSchema.title;
        }
        if (!subSchema.title && !subSchema.$ref) {
          // Try to get definition name if missing
          const maybeDefinitionBasedPath = path.includes('/definitions/') ? path.split('/definitions/')[1] : path;
          let pathBasedName = maybeDefinitionBasedPath.split('/properties').join('').split('/').join('_');
          switch (subSchema.type) {
            case 'string':
              // If it has special pattern, use path based name because it is specific
              if (subSchema.pattern || subSchema.maxLength || subSchema.minLength || subSchema.enum) {
                subSchema.title = pathBasedName;
                // Otherwise use the format name
              } else if (subSchema.format) {
                subSchema.title = subSchema.format;
              }
              break;
            case 'integer':
              // Use format name
              if (subSchema.format) {
                subSchema.title = subSchema.format;
              }
              break;
          }
          // If type name is reserved, add a suffix
          if (reservedTypeNames.includes(pathBasedName)) {
            pathBasedName += '_';
          }
          subSchema.title = subSchema.title || pathBasedName;
        }
        // Try to find the type
        if (!subSchema.type) {
          // If required exists without properties
          if (subSchema.required && !subSchema.properties) {
            // Add properties
            subSchema.properties = {};
            for (const missingPropertyName of subSchema.required) {
              subSchema.properties[missingPropertyName] = {
                oneOf: [
                  { type: 'string' },
                  { type: 'integer' },
                  { type: 'boolean' },
                  { type: 'object', additionalProperties: true },
                ],
              };
            }
          }
          // Properties only exist in objects
          if (subSchema.properties) {
            subSchema.type = 'object';
          }
          // Items only exist in arrays
          if (subSchema.items) {
            subSchema.type = 'array';
          }
        }
      }
      return subSchema;
    },
    {
      visitedSubschemaResultMap: new WeakMap(),
      path: '',
      keepObjectRef: true,
      onCircularReference: OnCircularReference.IGNORE,
    }
  );
}
