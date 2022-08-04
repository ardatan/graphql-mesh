import { process } from '@graphql-mesh/cross-helpers';
import { JSONSchema, JSONSchemaObject } from './types';
import { visitJSONSchema } from './visitJSONSchema';
import toJsonSchema from 'to-json-schema';
import { inspect } from '@graphql-tools/utils';

const asArray = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value]);

const reservedTypeNames = ['Query', 'Mutation', 'Subscription'];

const JSONSchemaStringFormats = [
  'date',
  'hostname',
  'regex',
  'json-pointer',
  'relative-json-pointer',
  'uri-reference',
  'uri-template',
  'date-time',
  'time',
  'email',
  'ipv4',
  'ipv6',
  'uri',
];

const AnySchema = {
  title: 'Any',
  oneOf: [
    { type: 'string' },
    { type: 'integer' },
    { type: 'boolean' },
    { type: 'number' },
    { type: 'object', additionalProperties: true },
  ],
};

const titleResolvedRefReservedMap = new WeakMap<
  JSONSchemaObject,
  {
    title?: string;
    $resolvedRef?: string;
  }
>();

function removeTitlesAndResolvedRefs(schema: JSONSchema) {
  if (typeof schema === 'object' && schema != null && !titleResolvedRefReservedMap.has(schema)) {
    if (!schema.$comment) {
      const titleReserved = schema.title;
      if (titleReserved) {
        schema.title = undefined;
      }
      const resolvedRefReserved = schema.$resolvedRef;
      if (resolvedRefReserved) {
        schema.$resolvedRef = undefined;
      }
      titleResolvedRefReservedMap.set(schema, {
        title: titleReserved,
        $resolvedRef: resolvedRefReserved,
      });
      for (const key in schema) {
        if (key === 'properties') {
          for (const propertyName in schema.properties) {
            schema[key][propertyName] = removeTitlesAndResolvedRefs(schema[key][propertyName]);
          }
        } else {
          schema[key] = removeTitlesAndResolvedRefs(schema[key]);
        }
      }
    }
  }
  return schema;
}

function deduplicateJSONSchema(schema: JSONSchema, seenMap = new Map()) {
  if (typeof schema === 'object' && schema != null) {
    if (!schema.$comment) {
      const stringified = inspect(schema.properties || schema)
        .split('[Circular]')
        .join('[Object]');
      const seen = seenMap.get(stringified);
      if (seen) {
        return seen;
      }
      seenMap.set(stringified, schema);
      for (const key in schema) {
        if (key === 'properties') {
          for (const propertyName in schema.properties) {
            schema.properties[propertyName] = deduplicateJSONSchema(schema.properties[propertyName], seenMap);
          }
        } else {
          schema[key] = deduplicateJSONSchema(schema[key], seenMap);
        }
      }
    }
  }
  return schema;
}

const visited = new WeakSet();

function addTitlesAndResolvedRefs(schema: JSONSchema) {
  if (typeof schema === 'object' && schema != null && !visited.has(schema)) {
    visited.add(schema);
    if (!schema.$comment) {
      const reservedTitleAndResolveRef = titleResolvedRefReservedMap.get(schema);
      if (reservedTitleAndResolveRef) {
        if (!schema.title && reservedTitleAndResolveRef.title) {
          schema.title = reservedTitleAndResolveRef.title;
        }
        if (!schema.$resolvedRef && reservedTitleAndResolveRef.$resolvedRef) {
          schema.$resolvedRef = reservedTitleAndResolveRef.$resolvedRef;
        }
      }
      for (const key in schema) {
        if (key === 'properties') {
          for (const propertyName in schema.properties) {
            schema.properties[propertyName] = addTitlesAndResolvedRefs(schema.properties[propertyName]);
          }
        } else {
          schema[key] = addTitlesAndResolvedRefs(schema[key]);
        }
      }
    }
  }
  return schema;
}

async function getDeduplicatedTitles(schema: JSONSchema): Promise<Set<string>> {
  const duplicatedTypeNames = new Set<string>();
  const seenTypeNames = new Set<string>();
  await visitJSONSchema(
    schema,
    {
      leave: subSchema => {
        if (typeof subSchema === 'object' && subSchema.title) {
          if (seenTypeNames.has(subSchema.title)) {
            duplicatedTypeNames.add(subSchema.title);
          } else {
            seenTypeNames.add(subSchema.title);
          }
        }
        return subSchema;
      },
    },
    {
      visitedSubschemaResultMap: new WeakMap(),
      path: '',
    }
  );
  return duplicatedTypeNames;
}
export async function healJSONSchema(
  schema: JSONSchema,
  options: { noDeduplication?: boolean } = {}
): Promise<JSONSchema> {
  let readySchema = schema;
  if (!options?.noDeduplication) {
    const schemaWithoutResolvedRefAndTitles = removeTitlesAndResolvedRefs(schema);
    const deduplicatedSchemaWithoutResolvedRefAndTitles = options?.noDeduplication
      ? schema
      : deduplicateJSONSchema(schemaWithoutResolvedRefAndTitles);
    const deduplicatedSchema = addTitlesAndResolvedRefs(deduplicatedSchemaWithoutResolvedRefAndTitles);
    readySchema = deduplicatedSchema;
  }
  const duplicatedTypeNames = await getDeduplicatedTitles(readySchema);
  return visitJSONSchema(
    readySchema,
    {
      enter: async function healSubschema(subSchema, { path }) {
        if (typeof subSchema === 'object') {
          if (process.env.DEBUG) {
            console.log(`Healing ${path}`);
          }
          // We don't support following properties
          delete subSchema.readOnly;
          delete subSchema.writeOnly;
          const keys = Object.keys(subSchema);
          if (keys.length === 0) {
            subSchema.type = 'object';
            subSchema.additionalProperties = true;
          }
          if (typeof subSchema.additionalProperties === 'object') {
            delete subSchema.additionalProperties.readOnly;
            delete subSchema.additionalProperties.writeOnly;
            if (Object.keys(subSchema.additionalProperties).length === 0) {
              subSchema.additionalProperties = true;
            }
          }
          if (subSchema.allOf != null && subSchema.allOf.length === 1 && !subSchema.properties) {
            const realSubschema = subSchema.allOf[0];
            delete subSchema.allOf;
            return realSubschema;
          }
          if (subSchema.anyOf != null && subSchema.anyOf.length === 1 && !subSchema.properties) {
            const realSubschema = subSchema.anyOf[0];
            delete subSchema.anyOf;
            return realSubschema;
          }
          if (subSchema.oneOf != null && subSchema.oneOf.length === 1) {
            const realSubschema = subSchema.oneOf[0];
            delete subSchema.oneOf;
            return realSubschema;
          }
          if (subSchema.description != null) {
            subSchema.description = subSchema.description.trim();
            if (keys.length === 1) {
              subSchema.type = 'object';
              subSchema.additionalProperties = true;
            }
          }
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
          if (typeof subSchema.example === 'object' && !subSchema.type) {
            subSchema.type = 'object';
          }
          // Try to find the type
          if (!subSchema.type) {
            // If required exists without properties
            if (subSchema.required && !subSchema.properties && !subSchema.anyOf && !subSchema.allOf) {
              // Add properties
              subSchema.properties = {};
              for (const missingPropertyName of subSchema.required) {
                subSchema.properties[missingPropertyName] = AnySchema;
              }
            }
            // Properties only exist in objects
            if (subSchema.properties || subSchema.patternProperties || 'additionalProperties' in subSchema) {
              subSchema.type = 'object';
            }
            // Items only exist in arrays
            if (subSchema.items) {
              subSchema.type = 'array';
              // Items should be an object
              if (Array.isArray(subSchema.items)) {
                if (subSchema.items.length === 0) {
                  subSchema.items = subSchema.items[0];
                } else {
                  subSchema.items = {
                    oneOf: subSchema.items,
                  };
                }
              }
            }
            switch (subSchema.format) {
              case 'int64':
              case 'int32':
                subSchema.type = 'integer';
                break;
              default:
                if (subSchema.format != null) {
                  subSchema.type = 'string';
                }
            }
          }
          if (subSchema.type === 'string' && !subSchema.format && (subSchema.examples || subSchema.example)) {
            const examples = asArray(subSchema.examples || subSchema.example || []);
            if (examples?.length) {
              const { format } = toJsonSchema(examples[0]);
              if (format) {
                subSchema.format = format;
              }
            }
          }
          if (subSchema.format === 'dateTime') {
            subSchema.format = 'date-time';
          }
          if (subSchema.type === 'string' && subSchema.format) {
            if (!JSONSchemaStringFormats.includes(subSchema.format)) {
              delete subSchema.format;
            }
          }
          if (subSchema.required) {
            if (!Array.isArray(subSchema.required)) {
              delete subSchema.required;
            }
          }
          // If it is an object type but no properties given while example is available
          if (((subSchema.type === 'object' && !subSchema.properties) || !subSchema.type) && subSchema.example) {
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
            const healedGeneratedSchema: any = await healJSONSchema(generatedSchema as any, options);
            subSchema.type = asArray(healedGeneratedSchema.type)[0] as any;
            subSchema.properties = healedGeneratedSchema.properties;
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
                }
                break;
              case 'number':
              case 'integer':
                if (subSchema.enum || subSchema.pattern) {
                  subSchema.title = pathBasedName;
                  // Otherwise use the format name
                }
                break;
              case 'array':
                break;
              case 'boolean':
                // pattern is unnecessary for boolean
                if (subSchema.pattern) {
                  delete subSchema.pattern;
                }
                // enum is unnecessary for boolean
                if (subSchema.enum) {
                  delete subSchema.enum;
                }
                break;
              default:
                subSchema.title = subSchema.title || pathBasedName;
            }
            // If type name is reserved, add a suffix
            if (reservedTypeNames.includes(pathBasedName)) {
              pathBasedName += '_';
            }
          }
          if (subSchema.type === 'object' && subSchema.properties && Object.keys(subSchema.properties).length === 0) {
            delete subSchema.properties;
            subSchema.additionalProperties = true;
          }
        }
        return subSchema;
      },
    },
    {
      visitedSubschemaResultMap: new WeakMap(),
      path: '',
    }
  );
}
