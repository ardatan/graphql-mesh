import { inspect } from 'util';
import { JSONSchema } from './types';
import { OnCircularReference, visitJSONSchema } from './visitJSONSchema';
import toJsonSchema from 'to-json-schema';

const asArray = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value]);

const reservedTypeNames = ['Query', 'Mutation', 'Subscription'];

function deduplicateJSONSchema(schema: JSONSchema, seenMap = new Map()) {
  if (typeof schema === 'object' && schema != null) {
    if (!schema.$comment) {
      const titleReserved = schema.title;
      if (titleReserved) {
        schema.title = undefined;
      }
      const stringified = inspect(schema, undefined, 3);
      if (titleReserved) {
        schema.title = titleReserved;
      }
      const seen = seenMap.get(stringified);
      if (seen) {
        return seen;
      }
      seenMap.set(stringified, schema);
    }
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
        // Some JSON Schemas use this broken pattern and refer the type using `items`
        if (subSchema.type === 'object' && subSchema.items) {
          const realSubschema = subSchema.items;
          delete subSchema.items;
          return realSubschema;
        }
        if (subSchema.properties && subSchema.type !== 'object') {
          subSchema.type = 'object';
        }
        if (duplicatedTypeNames.has(subSchema.title)) {
          delete subSchema.title;
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
          if (subSchema.properties || subSchema.patternProperties || 'additionalProperties' in subSchema) {
            subSchema.type = 'object';
          }
          // Items only exist in arrays
          if (subSchema.items) {
            subSchema.type = 'array';
          }
        }
        if (subSchema.type === 'string' && !subSchema.format && (subSchema.examples || subSchema.example)) {
          const examples = asArray(subSchema.examples || subSchema.example || []);
          if (examples?.length) {
            const { format } = toJsonSchema(examples[0]);
            if (format || format !== 'utc-millisec') {
              subSchema.format = format;
            }
          }
        }
        // If it is an object type but no properties given while example is available
        if (subSchema.type === 'object' && !subSchema.properties && subSchema.example) {
          const generatedSchema = toJsonSchema(subSchema.example, {
            required: false,
            objects: {
              additionalProperties: false,
            },
            strings: {
              detectFormat: true,
            },
            arrays: {
              mode: 'first',
            },
          });
          subSchema.properties = generatedSchema.properties;
          // If type for properties is already given, use it
          if (typeof subSchema.additionalProperties === 'object') {
            for (const propertyName in subSchema.properties) {
              subSchema.properties[propertyName] = subSchema.additionalProperties;
            }
          }
        }
        if (!subSchema.title && !subSchema.$ref && subSchema.type !== 'array' && !subSchema.items) {
          const realPath = subSchema.$resolvedRef || path;
          // Try to get definition name if missing
          const splitByDefinitions = realPath.includes('/components/schemas/')
            ? realPath.split('/components/schemas/')
            : realPath.split('/definitions/');
          const maybeDefinitionBasedPath =
            splitByDefinitions.length > 1 ? splitByDefinitions[splitByDefinitions.length - 1] : realPath;
          let pathBasedName = maybeDefinitionBasedPath
            .split('~1')
            .join('/')
            .split('/properties')
            .join('')
            .split('-')
            .join('_')
            .split('/')
            .filter(Boolean)
            .join('_');
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
            case 'array':
              break;
            default:
              subSchema.title = subSchema.title || pathBasedName;
          }
          // If type name is reserved, add a suffix
          if (reservedTypeNames.includes(pathBasedName)) {
            pathBasedName += '_';
          }
        }
        if (subSchema.description != null) {
          subSchema.description = subSchema.description.trim();
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
