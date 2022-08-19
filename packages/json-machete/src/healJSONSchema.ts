import { JSONSchema, JSONSchemaObject } from './types';
import { visitJSONSchema } from './visitJSONSchema';
import toJsonSchema from 'to-json-schema';
import { DefaultLogger } from '@graphql-mesh/utils';
import { Logger } from '@graphql-mesh/types';
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
  'uuid',
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
  { logger = new DefaultLogger('healJSONSchema') }: { logger?: Logger } = {}
): Promise<JSONSchema> {
  const schemaByTitle = new Map<string, JSONSchemaObject>();
  const anySchemaOneOfInspect = inspect(AnySchema.oneOf);
  return visitJSONSchema(
    schema,
    {
      enter: async function healSubschema(subSchema, { path }) {
        if (typeof subSchema === 'object') {
          if (subSchema.title === 'Any' || (subSchema.oneOf && inspect(subSchema.oneOf) === anySchemaOneOfInspect)) {
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
          } else if (Object.keys(subSchema).length === 1 && subSchema.type) {
            return subSchema;
          }
          // We don't support following properties
          delete subSchema.readOnly;
          delete subSchema.writeOnly;
          const keys = Object.keys(subSchema);
          if (keys.length === 0) {
            logger.debug(`${path} has an empty definition. Adding an object definition.`);
            subSchema.type = 'object';
            subSchema.additionalProperties = true;
          }
          if (typeof subSchema.additionalProperties === 'object') {
            delete subSchema.additionalProperties.readOnly;
            delete subSchema.additionalProperties.writeOnly;
            const additionalPropertiesKeys = Object.keys(subSchema.additionalProperties);
            if (
              additionalPropertiesKeys.length === 0 ||
              (additionalPropertiesKeys.length === 1 && subSchema.additionalProperties.type === 'string')
            ) {
              logger.debug(
                `${path} has an empty additionalProperties object. So this is invalid. Replacing it with 'true'`
              );
              subSchema.additionalProperties = true;
            }
          }
          if (subSchema.allOf != null && subSchema.allOf.length === 1 && !subSchema.properties) {
            logger.debug(`${path} has an "allOf" definition with only one element. Removing it.`);
            const realSubschema = subSchema.allOf[0];
            delete subSchema.allOf;
            subSchema = realSubschema;
          }
          if (subSchema.anyOf != null && subSchema.anyOf.length === 1 && !subSchema.properties) {
            logger.debug(`${path} has an "anyOf" definition with only one element. Removing it.`);
            const realSubschema = subSchema.anyOf[0];
            delete subSchema.anyOf;
            subSchema = realSubschema;
          }
          if (subSchema.oneOf != null && subSchema.oneOf.length === 1 && !subSchema.properties) {
            logger.debug(`${path} has an "oneOf" definition with only one element. Removing it.`);
            const realSubschema = subSchema.oneOf[0];
            delete subSchema.oneOf;
            subSchema = realSubschema;
          }
          if (subSchema.description != null) {
            subSchema.description = subSchema.description.trim();
            if (keys.length === 1) {
              logger.debug(`${path} has a description definition but has nothing else. Adding an object definition.`);
              subSchema.type = 'object';
              subSchema.additionalProperties = true;
            }
          }
          // Some JSON Schemas use this broken pattern and refer the type using `items`
          if (subSchema.type === 'object' && subSchema.items) {
            logger.debug(
              `${path} has an object definition but with "items" which is not valid. So setting "items" to the actual definition.`
            );
            const realSubschema = subSchema.items;
            delete subSchema.items;
            subSchema = realSubschema;
          }
          if (subSchema.properties && subSchema.type !== 'object') {
            logger.debug(`${path} has "properties" with no type defined. Adding a type property with "object" value.`);
            subSchema.type = 'object';
          }
          if (typeof subSchema.example === 'object' && !subSchema.type) {
            logger.debug(`${path} has an example object but no type defined. Setting type to "object".`);
            subSchema.type = 'object';
          }
          // Try to find the type
          if (!subSchema.type) {
            logger.debug(`${path} has no type defined. Trying to find it.`);
            // If required exists without properties
            if (subSchema.required && !subSchema.properties && !subSchema.anyOf && !subSchema.allOf) {
              logger.debug(
                `${path} has a required definition but no properties or oneOf/allOf. Setting missing properties with Any schema.`
              );
              // Add properties
              subSchema.properties = {};
              for (const missingPropertyName of subSchema.required) {
                subSchema.properties[missingPropertyName] = AnySchema;
              }
            }
            // Properties only exist in objects
            if (subSchema.properties || subSchema.patternProperties || 'additionalProperties' in subSchema) {
              logger.debug(
                `${path} has properties or patternProperties or additionalProperties. Setting type to "object".`
              );
              subSchema.type = 'object';
            }
            // Items only exist in arrays
            if (subSchema.items) {
              logger.debug(`${path} has an items definition but no type defined. Setting type to "array".`);
              subSchema.type = 'array';
              // Items should be an object
              if (Array.isArray(subSchema.items)) {
                if (subSchema.items.length === 0) {
                  logger.debug(`${path} has an items array with a single value. Setting items to an object.`);
                  subSchema.items = subSchema.items[0];
                } else {
                  logger.debug(
                    `${path} has an items array with multiple values. Setting items to an object with oneOf definition.`
                  );
                  subSchema.items = {
                    oneOf: subSchema.items,
                  };
                }
              }
            }
            switch (subSchema.format) {
              case 'int64':
              case 'int32':
                logger.debug(`${path} has a format of ${subSchema.format}. Setting type to "integer".`);
                subSchema.type = 'integer';
                break;
              default:
                if (subSchema.format != null) {
                  logger.debug(`${path} has a format of ${subSchema.format}. Setting type to "string".`);
                  subSchema.type = 'string';
                }
            }
          }
          if (subSchema.type === 'string' && !subSchema.format && (subSchema.examples || subSchema.example)) {
            const examples = asArray(subSchema.examples || subSchema.example || []);
            if (examples?.length) {
              const { format } = toJsonSchema(examples[0]);
              if (format) {
                logger.debug(`${path} has a format of ${format} according to the example. Setting type to "string".`);
                subSchema.format = format;
              }
            }
          }
          if (subSchema.format === 'dateTime') {
            logger.debug(`${path} has a format of dateTime. It should be "date-time".`);
            subSchema.format = 'date-time';
          }
          if (subSchema.type === 'string' && subSchema.format) {
            if (!JSONSchemaStringFormats.includes(subSchema.format)) {
              logger.debug(
                `${path} has a format of ${subSchema.format}. It should be one of ${JSONSchemaStringFormats.join(
                  ', '
                )}.`
              );
              delete subSchema.format;
            }
          }
          if (subSchema.required) {
            if (!Array.isArray(subSchema.required)) {
              logger.debug(`${path} has a required definition but it is not an array. Removing it.`);
              delete subSchema.required;
            }
          }
          // If it is an object type but no properties given while example is available
          if (
            ((subSchema.type === 'object' && !subSchema.properties) || !subSchema.type) &&
            (subSchema.example || subSchema.examples)
          ) {
            const examples = asArray(subSchema.examples || subSchema.example || []);
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
                if (schema.type === 'object' && !schema.properties && Object.keys(value).length === 0) {
                  return AnySchema as any;
                }
                return defaultFunc(type, schema, value);
              },
            });
            subSchema.type = asArray(generatedSchema.type)[0] as any;
            subSchema.properties = generatedSchema.properties;
            // If type for properties is already given, use it
            logger.debug(`${path} has an example but no type defined. Setting type to ${subSchema.type}.`);
            // if (typeof subSchema.additionalProperties === 'object') {
            //   for (const propertyName in subSchema.properties) {
            //     subSchema.properties[propertyName] = subSchema.additionalProperties;
            //   }
            // }
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
                  logger.debug(
                    `${path} has a pattern or maxLength or minLength or enum but no title. Setting it to ${pathBasedName}`
                  );
                  subSchema.title = pathBasedName;
                  // Otherwise use the format name
                }
                break;
              case 'number':
              case 'integer':
                if (subSchema.enum || subSchema.pattern) {
                  logger.debug(`${path} has an enum or pattern but no title. Setting it to ${pathBasedName}`);
                  subSchema.title = pathBasedName;
                  // Otherwise use the format name
                }
                break;
              case 'array':
                break;
              case 'boolean':
                // pattern is unnecessary for boolean
                if (subSchema.pattern) {
                  logger.debug(`${path} has a pattern for a boolean type. Removing it.`);
                  delete subSchema.pattern;
                }
                // enum is unnecessary for boolean
                if (subSchema.enum) {
                  logger.debug(`${path} is an enum but a boolean type. Removing it.`);
                  delete subSchema.enum;
                }
                break;
              default:
                logger.debug(`${path} has no title. Setting it to ${pathBasedName}`);
                subSchema.title = subSchema.title || pathBasedName;
            }
            // If type name is reserved, add a suffix
            if (reservedTypeNames.includes(pathBasedName)) {
              logger.debug(`${path} has a title of ${pathBasedName}. It is a reserved type name. Adding a suffix.`);
              pathBasedName += '_';
            }
          }
          if (subSchema.type === 'object' && subSchema.properties && Object.keys(subSchema.properties).length === 0) {
            logger.debug(
              `${path} has an empty properties object. Removing it and adding "additionalProperties": true.`
            );
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
