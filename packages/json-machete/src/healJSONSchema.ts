import { inspect } from 'cross-inspect';
import toJsonSchema from 'to-json-schema';
import type { JSONSchema, JSONSchemaObject } from './types.js';
import { visitJSONSchema } from './visitJSONSchema.js';

const asArray = <T>(value: T | T[]): T[] => (Array.isArray(value) ? value : [value]);

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
  'uuid',
  'binary',
  'byte',
  'int64',
  'int32',
  'unix-time',
  'double',
  'float',
  'decimal',
];

export const AnySchema = {
  title: 'Any',
  oneOf: [
    { type: 'string' },
    { type: 'integer' },
    { type: 'boolean' },
    { type: 'number' },
    { type: 'object', additionalProperties: true },
  ],
};

export async function healJSONSchema(
  schema: JSONSchema,
  debugLogFn?: (message?: any) => void,
): Promise<JSONSchema> {
  const schemaByTitle = new Map<string, JSONSchemaObject>();
  const anySchemaOneOfInspect = inspect(AnySchema.oneOf);
  return visitJSONSchema(
    schema,
    {
      enter: async function healSubschema(subSchema, { path }) {
        if (typeof subSchema === 'object') {
          if (
            subSchema.title === 'Any' ||
            (subSchema.oneOf && inspect(subSchema.oneOf) === anySchemaOneOfInspect)
          ) {
            return AnySchema;
          }
          if (subSchema.title) {
            if (Object.keys(subSchema).length === 2 && subSchema.type) {
              delete subSchema.title;
            } else {
              const existingSubSchema = schemaByTitle.get(subSchema.title);
              if (existingSubSchema) {
                if (inspect(subSchema) === inspect(existingSubSchema)) {
                  return existingSubSchema;
                } else {
                  delete subSchema.title;
                }
              } else {
                schemaByTitle.set(subSchema.title, subSchema);
              }
            }
          } else if (
            Object.keys(subSchema).length === 1 &&
            subSchema.type &&
            !Array.isArray(subSchema.type)
          ) {
            return subSchema;
          }
          const keys = Object.keys(subSchema).filter(
            key => key !== 'readOnly' && key !== 'writeOnly',
          );
          if (keys.length === 0) {
            debugLogFn?.(`${path} has an empty definition. Adding an object definition.`);
            subSchema.type = 'object';
            subSchema.additionalProperties = true;
          }
          if (typeof subSchema.additionalProperties === 'object') {
            const additionalPropertiesKeys = Object.keys(subSchema.additionalProperties).filter(
              key => key !== 'readOnly' && key !== 'writeOnly',
            );
            if (
              additionalPropertiesKeys.length === 0 ||
              (additionalPropertiesKeys.length === 1 &&
                subSchema.additionalProperties.type === 'string')
            ) {
              debugLogFn?.(
                `${path} has an empty additionalProperties object. So this is invalid. Replacing it with 'true'`,
              );
              subSchema.additionalProperties = true;
            }
          }
          // Really edge case, but we need to support it
          if (
            subSchema.allOf != null &&
            subSchema.allOf.length === 1 &&
            subSchema.allOf[0].oneOf &&
            subSchema.oneOf
          ) {
            subSchema.oneOf.push(...subSchema.allOf[0].oneOf);
            delete subSchema.allOf;
          }
          // If they have title, it makes sense to keep them to reflect the schema in a better way
          if (!subSchema.title) {
            if (
              subSchema.anyOf != null &&
              subSchema.anyOf.length === 1 &&
              !subSchema.properties &&
              !subSchema.allOf &&
              !subSchema.oneOf
            ) {
              debugLogFn?.(`${path} has an "anyOf" definition with only one element. Removing it.`);
              const realSubschema = subSchema.anyOf[0];
              delete subSchema.anyOf;
              subSchema = realSubschema;
            }
            if (
              subSchema.allOf != null &&
              subSchema.allOf.length === 1 &&
              !subSchema.properties &&
              !subSchema.anyOf &&
              !subSchema.oneOf
            ) {
              debugLogFn?.(`${path} has an "allOf" definition with only one element. Removing it.`);
              const realSubschema = subSchema.allOf[0];
              delete subSchema.allOf;
              subSchema = realSubschema;
            }
          }
          if (
            subSchema.oneOf != null &&
            subSchema.oneOf.length === 1 &&
            !subSchema.properties &&
            !subSchema.anyOf &&
            !subSchema.allOf
          ) {
            debugLogFn?.(`${path} has an "oneOf" definition with only one element. Removing it.`);
            const realSubschema = subSchema.oneOf[0];
            delete subSchema.oneOf;
            subSchema = realSubschema;
          }
          if (subSchema.description != null) {
            subSchema.description = subSchema.description.trim();
            if (keys.length === 1) {
              debugLogFn?.(
                `${path} has a description definition but has nothing else. Adding an object definition.`,
              );
              subSchema.type = 'object';
              subSchema.additionalProperties = true;
            }
          }
          // Some JSON Schemas use this broken pattern and refer the type using `items`
          if (subSchema.type === 'object' && subSchema.items) {
            debugLogFn?.(
              `${path} has an object definition but with "items" which is not valid. So setting "items" to the actual definition.`,
            );
            const realSubschema = subSchema.items;
            delete subSchema.items;
            subSchema = realSubschema;
          }
          if (subSchema.properties && subSchema.type !== 'object') {
            debugLogFn?.(
              `${path} has "properties" with no type defined. Adding a type property with "object" value.`,
            );
            subSchema.type = 'object';
          }
          if (typeof subSchema.example === 'object' && !subSchema.type) {
            debugLogFn?.(
              `${path} has an example object but no type defined. Setting type to "object".`,
            );
            subSchema.type = 'object';
          }
          // Items only exist in arrays
          if (subSchema.items) {
            debugLogFn?.(
              `${path} has an items definition but no type defined. Setting type to "array".`,
            );
            subSchema.type = 'array';
            if (subSchema.properties) {
              delete subSchema.properties;
            }
            // Items should be an object
            if (Array.isArray(subSchema.items)) {
              if (subSchema.items.length === 0) {
                debugLogFn?.(
                  `${path} has an items array with a single value. Setting items to an object.`,
                );
                subSchema.items = subSchema.items[0];
              } else {
                debugLogFn?.(
                  `${path} has an items array with multiple values. Setting items to an object with oneOf definition.`,
                );
                subSchema.items = {
                  oneOf: subSchema.items,
                };
              }
            }
          }
          // Try to find the type
          if (!subSchema.type) {
            debugLogFn?.(`${path} has no type defined. Trying to find it.`);
            // If required exists without properties
            if (
              Array.isArray(subSchema.required) &&
              !subSchema.properties &&
              !subSchema.anyOf &&
              !subSchema.allOf
            ) {
              debugLogFn?.(
                `${path} has a required definition but no properties or oneOf/allOf. Setting missing properties with Any schema.`,
              );
              // Add properties
              subSchema.properties = {};
              for (const missingPropertyName of subSchema.required) {
                subSchema.properties[missingPropertyName] = AnySchema;
              }
            }
            // Properties only exist in objects
            if (
              subSchema.properties ||
              subSchema.patternProperties ||
              'additionalProperties' in subSchema
            ) {
              debugLogFn?.(
                `${path} has properties or patternProperties or additionalProperties. Setting type to "object".`,
              );
              subSchema.type = 'object';
            }
            switch (subSchema.format) {
              case 'int64':
              case 'int32':
                debugLogFn?.(
                  `${path} has a format of ${subSchema.format}. Setting type to "integer".`,
                );
                subSchema.type = 'integer';
                break;
              case 'float':
              case 'double':
                debugLogFn?.(
                  `${path} has a format of ${subSchema.format}. Setting type to "number".`,
                );
                subSchema.type = 'number';
                break;
              default:
                if (subSchema.format != null) {
                  debugLogFn?.(
                    `${path} has a format of ${subSchema.format}. Setting type to "string".`,
                  );
                  subSchema.type = 'string';
                }
            }
            if (subSchema.minimum != null || subSchema.maximum != null) {
              debugLogFn?.(`${path} has a minimum or maximum. Setting type to "number".`);
              subSchema.type = 'number';
            }
          }
          if (
            subSchema.type === 'string' &&
            !subSchema.format &&
            (subSchema.examples || subSchema.example)
          ) {
            const examples = asArray(subSchema.examples || subSchema.example || []);
            if (examples?.length) {
              const { format } = toJsonSchema(examples[0]);
              if (format && format !== 'utc-millisec' && format !== 'style') {
                debugLogFn?.(
                  `${path} has a format of ${format} according to the example. Setting type to "string".`,
                );
                subSchema.format = format;
              }
            }
          }
          if (subSchema.format === 'dateTime') {
            debugLogFn?.(`${path} has a format of dateTime. It should be "date-time".`);
            subSchema.format = 'date-time';
          }
          if (subSchema.format) {
            if (!JSONSchemaStringFormats.includes(subSchema.format)) {
              debugLogFn?.(
                `${path} has a format of ${
                  subSchema.format
                }. It should be one of ${JSONSchemaStringFormats.join(', ')}.`,
              );
              delete subSchema.format;
            }
            if (subSchema.format === 'date-time' && subSchema.default != null) {
              try {
                if (new Date(subSchema.default).toJSON() !== subSchema.default) {
                  debugLogFn?.(
                    `${path} has a default value of ${subSchema.default} but it is not a valid date-time.`,
                  );
                  delete subSchema.default;
                }
              } catch (e) {
                debugLogFn?.(
                  `${path} has a default value of ${subSchema.default} but it is not a valid date-time.`,
                );
                delete subSchema.default;
              }
            }
          }
          if (subSchema.required) {
            if (!Array.isArray(subSchema.required) || subSchema.required.length === 0) {
              debugLogFn?.(
                `${path} has a required definition but it is not an array. Removing it.`,
              );
              delete subSchema.required;
            } else if (subSchema.properties) {
              for (const requiredProperty of subSchema.required) {
                if (!(requiredProperty in subSchema.properties)) {
                  debugLogFn?.(
                    `${path} has a required definition but it is not in properties. Adding it.`,
                  );
                  subSchema.properties[requiredProperty] = AnySchema;
                }
              }
            }
          }
          // If it is an object type but no properties given while example is available
          if (
            ((subSchema.type === 'object' &&
              !subSchema.properties &&
              !subSchema.allOf &&
              !subSchema.anyOf &&
              !subSchema.oneOf) ||
              !subSchema.type) &&
            (subSchema.example || subSchema.examples)
          ) {
            const examples = [];
            if (subSchema.example) {
              examples.push(subSchema.example);
            }
            if (subSchema.examples) {
              examples.push(...subSchema.examples);
            }
            const generatedSchema = toJsonSchema(examples[0], {
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
              postProcessFnc(type, schema, value, defaultFunc) {
                if (
                  schema.type === 'object' &&
                  !schema.properties &&
                  Object.keys(value).length === 0
                ) {
                  return AnySchema as any;
                }
                return defaultFunc(type, schema, value);
              },
            });
            subSchema.type = asArray(generatedSchema.type)[0] as any;
            if (generatedSchema.properties) {
              subSchema.properties = generatedSchema.properties;
            }
            if (generatedSchema.items) {
              subSchema.items = generatedSchema.items;
            }
            // If type for properties is already given, use it
            debugLogFn?.(
              `${path} has an example but no type defined. Setting type to ${subSchema.type}.`,
            );
            // if (typeof subSchema.additionalProperties === 'object') {
            //   for (const propertyName in subSchema.properties) {
            //     subSchema.properties[propertyName] = subSchema.additionalProperties;
            //   }
            // }
          }
          if (subSchema.enum && subSchema.enum.length === 1 && subSchema.type !== 'boolean') {
            subSchema.const = subSchema.enum[0];
            debugLogFn?.(`${path} has an enum but with a single value. Converting it to const.`);
            delete subSchema.enum;
          }
          if (subSchema.enum && subSchema.enum.includes(null)) {
            debugLogFn?.(`${path} has "null" value. Converting it to nullable.`);
            subSchema.enum = subSchema.enum.filter((e: unknown) => e != null);
            subSchema.nullable = true;
          }
          if (subSchema.const === null && subSchema.type !== 'null') {
            debugLogFn?.(`${path} has a const definition of null. Setting type to "null".`);
            subSchema.type = 'null';
            delete subSchema.const;
          }
          if (subSchema.enum && subSchema.default != null) {
            if (!subSchema.enum.includes(subSchema.default)) {
              debugLogFn?.(
                `${path} has an enum but the default value is not in the enum. Removing it.`,
              );
              delete subSchema.default;
            }
          }
          if (
            !subSchema.title &&
            !subSchema.$ref &&
            subSchema.type !== 'array' &&
            !subSchema.items
          ) {
            const realPath = subSchema.$resolvedRef || path;
            // Try to get definition name if missing
            const splitByDefinitions = realPath.includes('/components/schemas/')
              ? realPath.split('/components/schemas/')
              : realPath.split('/definitions/');
            const maybeDefinitionBasedPath =
              splitByDefinitions.length > 1
                ? splitByDefinitions[splitByDefinitions.length - 1]
                : realPath;
            const pathBasedName = maybeDefinitionBasedPath
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
                if (
                  subSchema.pattern ||
                  subSchema.maxLength ||
                  subSchema.minLength ||
                  subSchema.enum
                ) {
                  debugLogFn?.(
                    `${path} has a pattern or maxLength or minLength or enum but no title. Setting it to ${pathBasedName}`,
                  );
                  subSchema.title = pathBasedName;
                  // Otherwise use the format name
                }
                break;
              case 'number':
              case 'integer':
                if (subSchema.enum || subSchema.pattern) {
                  debugLogFn?.(
                    `${path} has an enum or pattern but no title. Setting it to ${pathBasedName}`,
                  );
                  subSchema.title = pathBasedName;
                  // Otherwise use the format name
                }
                break;
              case 'array':
                break;
              case 'boolean':
                // pattern is unnecessary for boolean
                if (subSchema.pattern) {
                  debugLogFn?.(`${path} has a pattern for a boolean type. Removing it.`);
                  delete subSchema.pattern;
                }
                // enum is unnecessary for boolean
                if (subSchema.enum) {
                  debugLogFn?.(`${path} is an enum but a boolean type. Removing it.`);
                  delete subSchema.enum;
                }
                break;
              default:
                debugLogFn?.(`${path} has no title. Setting it to ${pathBasedName}`);
                subSchema.title = subSchema.title || pathBasedName;
            }
            if (subSchema.const) {
              subSchema.title = subSchema.const.toString() + '_const';
              const existingSubSchema = schemaByTitle.get(subSchema.title);
              if (existingSubSchema) {
                return existingSubSchema;
              }
              schemaByTitle.set(subSchema.title, subSchema);
            }
          }
          if (
            subSchema.type === 'object' &&
            subSchema.properties &&
            Object.keys(subSchema.properties).length === 0
          ) {
            debugLogFn?.(
              `${path} has an empty properties object. Removing it and adding "additionalProperties": true.`,
            );
            delete subSchema.properties;
            subSchema.additionalProperties = true;
          }
          if (subSchema.properties) {
            const propertyValues: any[] = Object.values(subSchema.properties);
            if (propertyValues.every(property => property.writeOnly && !property.readOnly)) {
              subSchema.writeOnly = true;
            }
            if (propertyValues.every(property => property.readOnly && !property.writeOnly)) {
              subSchema.readOnly = true;
            }
          }
          if (subSchema.pattern) {
            // Fix non JS patterns
            const javaToJsPattern: Record<string, string> = {
              '\\p{Digit}': '[0-9]',
              '\\p{Alpha}': '[a-zA-Z]',
              '\\p{Alnum}': '[a-zA-Z0-9]',
              '\\p{ASCII}': '[\\x00-\\x7F]',
            };
            for (const javaPattern in javaToJsPattern) {
              if (subSchema.pattern.includes(javaPattern)) {
                const jsPattern = javaToJsPattern[javaPattern];
                subSchema.pattern = subSchema.pattern.split(javaPattern).join(jsPattern);
              }
            }
          }
          if (
            subSchema.default != null &&
            subSchema.type != null &&
            subSchema.type !== 'string' &&
            typeof subSchema.default === 'string'
          ) {
            debugLogFn?.(
              `${path} has a default value as a JSON string for the type ${subSchema.type}. Converting it to JSON.`,
            );
            try {
              subSchema.default = JSON.parse(subSchema.default);
            } catch (e) {
              debugLogFn?.(`${path} has a default value but it is not a valid JSON.`);
              delete subSchema.default;
            }
          }
        }
        return subSchema;
      },
    },
    {
      visitedSubschemaResultMap: new WeakMap(),
      path: '',
    },
  );
}
