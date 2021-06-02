/* eslint-disable no-case-declarations */
import {
  AnyTypeComposer,
  EnumTypeComposerValueConfigDefinition,
  GraphQLJSON,
  InputTypeComposerFieldConfigMap,
  isSomeInputTypeComposer,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfigMap,
  ScalarTypeComposer,
  SchemaComposer,
} from 'graphql-compose';
import { JSONSchema } from '@json-schema-tools/meta-schema';
import traverse from '@json-schema-tools/traverse';
import { GraphQLBoolean, GraphQLFloat, GraphQLInt, GraphQLString, isNonNullType } from 'graphql';
import {
  GraphQLBigInt,
  GraphQLDate,
  GraphQLDateTime,
  GraphQLEmailAddress,
  GraphQLIPv4,
  GraphQLIPv6,
  GraphQLTime,
  GraphQLURL,
  GraphQLVoid,
  RegularExpression,
} from 'graphql-scalars';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { readFileOrUrlWithCache, sanitizeNameForGraphQL, ReadFileOrUrlOptions } from '@graphql-mesh/utils';
import { KeyValueCache } from '@graphql-mesh/types';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

export async function flattenJSONSchema(
  schema: string | JSONSchema,
  cache: KeyValueCache<any>,
  config: ReadFileOrUrlOptions
) {
  const bundled = await bundleJSONSchema(schema, cache, config);
  return dereferenceJSONSchema(bundled);
}

export async function bundleJSONSchema(
  schema: string | JSONSchema,
  cache: KeyValueCache<any>,
  config: ReadFileOrUrlOptions
) {
  if (typeof schema === 'string') {
    schema = {
      $ref: schema,
    };
  }
  const options: $RefParser.Options = {
    resolve: {
      file: {
        read: (file, callback) =>
          readFileOrUrlWithCache(file.url, cache, config)
            .then(data => callback(null, JSON.stringify(data)))
            .catch(err => callback(err, null)),
      },
    },
  };
  const baseDir = config.cwd + '/';
  const bundled = await $RefParser.bundle(baseDir, schema as $RefParser.JSONSchema, options);
  return bundled;
}

export async function dereferenceJSONSchema(bundledSchema: $RefParser.JSONSchema) {
  const dereferenced = await $RefParser.dereference(bundledSchema);
  const titleized = traverse(
    dereferenced as any,
    (subSchema, _, path) => {
      if (typeof subSchema === 'object' && !subSchema.title) {
        subSchema.title = path.split('/properties').join('');
      }
      return subSchema;
    },
    {
      mutable: true,
    }
  );
  return titleized;
}

interface TypeComposers {
  input?: AnyTypeComposer<any>;
  output: AnyTypeComposer<any> | SchemaComposer;
}

export function getComposerFromJSONSchema(schema: JSONSchema): TypeComposers {
  const schemaComposer = new SchemaComposer();
  const subSchemaTypeComposerMap = new Map<any, TypeComposers>();
  const pathTypeComposerMap = new Map<string, TypeComposers>();
  const ajv = new Ajv({
    strict: false,
  });
  addFormats(ajv);
  function ensureTypeComposers(maybeTypeComposers: any) {
    return subSchemaTypeComposerMap.get(maybeTypeComposers) || maybeTypeComposers;
  }
  return traverse(schema, (subSchema, _, path): any => {
    if (subSchemaTypeComposerMap.has(subSchema)) {
      return subSchemaTypeComposerMap.get(subSchema);
    }

    const getTypeComposer = (): any => {
      if (typeof subSchema === 'boolean') {
        const typeComposer = schemaComposer.getAnyTC(GraphQLJSON);
        return subSchema
          ? {
              input: typeComposer,
              output: typeComposer,
            }
          : undefined;
      }
      const getValidTypeName = (isInput: boolean) => {
        const sanitizedName = sanitizeNameForGraphQL(isInput ? subSchema.title + '_Input' : subSchema.title);
        if (schemaComposer.has(sanitizedName)) {
          let i = 2;
          while (schemaComposer.has(sanitizedName + i)) {
            i++;
          }
          return sanitizedName + i;
        }
        return sanitizedName;
      };
      const validate = (data: any) =>
        ajv.validate(
          {
            $ref: '#/definitions/schema' + path,
            definitions: {
              schema,
            },
          },
          data
        );
      const getGenericJSONScalar = (isInput: boolean) => {
        const coerceValue = (value: any) => {
          if (!validate(value)) {
            throw new Error(`${JSON.stringify(value)} is not valid!`);
          }
          return value;
        };
        return schemaComposer.createScalarTC({
          name: getValidTypeName(isInput),
          description: subSchema.description,
          serialize: coerceValue,
          parseValue: coerceValue,
          parseLiteral: (...args) => {
            const value = GraphQLJSON.parseLiteral(...args);
            return coerceValue(value);
          },
        });
      };

      const getUnionTypeComposers = (maybeTypeComposersList: any[]) => {
        const unionInputFields: Record<string, any> = {};
        const outputTypeComposers: ObjectTypeComposer<any>[] = [];
        let ableToUseGraphQLUnionType = true;
        for (const maybeTypeComposers of maybeTypeComposersList) {
          const { input, output } = ensureTypeComposers(maybeTypeComposers);
          if (isSomeInputTypeComposer(output)) {
            ableToUseGraphQLUnionType = false;
          } else {
            outputTypeComposers.push(output);
          }
          unionInputFields[input.getTypeName()] = {
            type: input,
          };
        }
        const input = schemaComposer.createInputTC({
          name: getValidTypeName(true),
          description: subSchema.description,
          fields: unionInputFields,
        });
        input.setDirectives([
          {
            name: 'oneOf',
            args: {},
          },
        ]);
        return {
          input,
          output: ableToUseGraphQLUnionType
            ? schemaComposer.createUnionTC({
                name: getValidTypeName(false),
                description: subSchema.description,
                types: outputTypeComposers,
                resolveType: data =>
                  outputTypeComposers
                    .find(typeComposer => (typeComposer.getExtension('validate') as ValidateFunction)(data))
                    .getTypeName(),
              })
            : getGenericJSONScalar(false),
        };
      };

      if (subSchema.pattern) {
        const typeComposer = schemaComposer.createScalarTC({
          ...new RegularExpression(getValidTypeName(false), new RegExp(subSchema.pattern), {
            description: subSchema.description,
          }),
        });
        return {
          input: typeComposer,
          output: typeComposer,
        };
      }
      if (subSchema.const) {
        const typeComposer = schemaComposer.createScalarTC({
          ...new RegularExpression(getValidTypeName(false), new RegExp(subSchema.const), {
            description: subSchema.description,
          }),
        });
        return {
          input: typeComposer,
          output: typeComposer,
        };
      }
      if (subSchema.enum) {
        const values: Record<string, EnumTypeComposerValueConfigDefinition> = {};
        for (const value of subSchema.enum) {
          values[sanitizeNameForGraphQL(value)] = {
            value,
          };
        }
        const typeComposer = schemaComposer.createEnumTC({
          name: getValidTypeName(false),
          values,
        });
        return {
          input: typeComposer,
          output: typeComposer,
        };
      }

      if (subSchema.oneOf) {
        return getUnionTypeComposers(subSchema.oneOf);
      }

      if (subSchema.allOf) {
        // It should not have `required` because it is `anyOf` not `allOf`
        const inputFieldMap: InputTypeComposerFieldConfigMap = {};
        const fieldMap: ObjectTypeComposerFieldConfigMap<any, any> = {};
        let ableToUseGraphQLInputObjectType = true;
        let ableToUseGraphQLObjectType = true;
        for (const maybeTypeComposers of subSchema.allOf as any) {
          const { input: inputTypeComposer, output: outputTypeComposer } = ensureTypeComposers(maybeTypeComposers);

          if (inputTypeComposer instanceof ScalarTypeComposer) {
            ableToUseGraphQLInputObjectType = false;
          } else {
            const inputTypeElemFieldMap = inputTypeComposer.getFields();
            for (const fieldName in inputTypeElemFieldMap) {
              const field = inputTypeElemFieldMap[fieldName];
              inputFieldMap[fieldName] = field;
            }
          }

          if (outputTypeComposer instanceof ScalarTypeComposer) {
            ableToUseGraphQLObjectType = false;
          } else {
            const typeElemFieldMap = outputTypeComposer.getFields();
            for (const fieldName in typeElemFieldMap) {
              const field = typeElemFieldMap[fieldName];
              fieldMap[fieldName] = field;
            }
          }
        }

        let inputTypeComposer, outputTypeComposer;
        if (ableToUseGraphQLObjectType) {
          outputTypeComposer = schemaComposer.createObjectTC({
            name: getValidTypeName(false),
            description: subSchema.description,
            fields: fieldMap,
          });
        } else {
          outputTypeComposer = getGenericJSONScalar(false);
        }

        if (ableToUseGraphQLInputObjectType) {
          inputTypeComposer = schemaComposer.createInputTC({
            name: getValidTypeName(true),
            description: subSchema.description,
            fields: inputFieldMap,
          });
        } else {
          inputTypeComposer = ableToUseGraphQLObjectType ? getGenericJSONScalar(true) : outputTypeComposer;
        }

        return {
          input: inputTypeComposer,
          output: outputTypeComposer,
        };
      }

      if (subSchema.anyOf) {
        // It should not have `required` because it is `anyOf` not `allOf`
        const inputFieldMap: InputTypeComposerFieldConfigMap = {};
        const fieldMap: ObjectTypeComposerFieldConfigMap<any, any> = {};
        let ableToUseGraphQLInputObjectType = true;
        let ableToUseGraphQLObjectType = true;
        for (const maybeTypeComposers of subSchema.anyOf as any) {
          const { input: inputTypeComposer, output: outputTypeComposer } = ensureTypeComposers(maybeTypeComposers);
          if (inputTypeComposer instanceof ScalarTypeComposer) {
            ableToUseGraphQLInputObjectType = false;
          } else {
            const inputTypeElemFieldMap = inputTypeComposer.getFields();
            for (const fieldName in inputTypeElemFieldMap) {
              const field = inputTypeElemFieldMap[fieldName];
              inputFieldMap[fieldName] = isNonNullType(field.type.getType())
                ? {
                    ...field,
                    type: field.type.ofType,
                  }
                : field;
            }
          }

          if (outputTypeComposer instanceof ScalarTypeComposer) {
            ableToUseGraphQLObjectType = false;
          } else {
            const typeElemFieldMap = outputTypeComposer.getFields();
            for (const fieldName in typeElemFieldMap) {
              const field = typeElemFieldMap[fieldName];
              fieldMap[fieldName] = isNonNullType(field.type.getType())
                ? {
                    ...field,
                    type: field.type.ofType,
                  }
                : field;
            }
          }
        }

        let inputTypeComposer, outputTypeComposer;
        if (ableToUseGraphQLObjectType) {
          outputTypeComposer = schemaComposer.createObjectTC({
            name: getValidTypeName(false),
            description: subSchema.description,
            fields: fieldMap,
          });
        } else {
          outputTypeComposer = getGenericJSONScalar(false);
        }

        if (ableToUseGraphQLInputObjectType) {
          inputTypeComposer = schemaComposer.createInputTC({
            name: getValidTypeName(true),
            description: subSchema.description,
            fields: inputFieldMap,
          });
        } else {
          inputTypeComposer = ableToUseGraphQLObjectType ? getGenericJSONScalar(true) : outputTypeComposer;
        }

        return {
          input: inputTypeComposer,
          output: outputTypeComposer,
        };
      }

      if (Array.isArray(subSchema.type)) {
        const validTypes = subSchema.type.filter(typeName => typeName !== 'null');
        if (validTypes.length === 1) {
          subSchema.type = validTypes[0];
          // continue with the single type
        } else {
          const typeComposer = getGenericJSONScalar(false);
          return {
            input: typeComposer,
            output: typeComposer,
          };
        }
      }

      switch (subSchema.type) {
        case 'boolean': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLBoolean);
          return {
            input: typeComposer,
            output: typeComposer,
          };
        }
        case 'null': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLVoid);
          return {
            input: typeComposer,
            output: typeComposer,
          };
        }
        case 'integer': {
          if (subSchema.format === 'int64') {
            const typeComposer = schemaComposer.getAnyTC(GraphQLBigInt);
            return {
              input: typeComposer,
              output: typeComposer,
            };
          }
          const typeComposer = schemaComposer.getAnyTC(GraphQLInt);
          return {
            input: typeComposer,
            output: typeComposer,
          };
        }
        case 'number': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLFloat);
          return {
            input: typeComposer,
            output: typeComposer,
          };
        }
        case 'string':
          if (subSchema.minLength || subSchema.maxLength) {
            const typeComposerName = getValidTypeName(false);
            const coerceString = (v: any) => {
              if (v != null) {
                const vStr = v.toString();
                if (typeof subSchema.minLength !== 'undefined' && vStr.length < subSchema.minLength) {
                  throw new Error(`${typeComposerName} cannot be less than ${subSchema.minLength}`);
                }
                if (typeof subSchema.maxLength !== 'undefined' && vStr.length > subSchema.maxLength) {
                  throw new Error(`${typeComposerName} cannot be more than ${subSchema.maxLength}`);
                }
                return vStr;
              }
            };
            const typeComposer = schemaComposer.createScalarTC({
              name: typeComposerName,
              description: subSchema.description,
              serialize: coerceString,
              parseLiteral: coerceString,
              parseValue: ast => ast?.value && coerceString(ast.value),
            });
            return {
              input: typeComposer,
              output: typeComposer,
            };
          }
          switch (subSchema.format) {
            case 'date-time': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLDateTime);
              return {
                input: typeComposer,
                output: typeComposer,
              };
            }
            case 'time': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLTime);
              return {
                input: typeComposer,
                output: typeComposer,
              };
            }
            case 'date': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLDate);
              return {
                input: typeComposer,
                output: typeComposer,
              };
            }
            case 'email': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLEmailAddress);
              return {
                input: typeComposer,
                output: typeComposer,
              };
            }
            case 'ipv4': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLIPv4);
              return {
                input: typeComposer,
                output: typeComposer,
              };
            }
            case 'ipv6': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLIPv6);
              return {
                input: typeComposer,
                output: typeComposer,
              };
            }
            case 'uri': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLURL);
              return {
                input: typeComposer,
                output: typeComposer,
              };
            }
            case 'idn-email':
            case 'hostname':
            case 'regex':
            case 'json-pointer':
            case 'relative-json-pointer':
            case 'uri-reference':
            case 'iri':
            case 'iri-reference':
            case 'uri-template': {
              // Trust ajv
              const typeComposer = schemaComposer.getAnyTC(GraphQLString);
              return {
                input: typeComposer,
                output: typeComposer,
              };
            }
            default: {
              const typeComposer = schemaComposer.getAnyTC(GraphQLString);
              return {
                input: typeComposer,
                output: typeComposer,
              };
            }
          }

        case 'array':
          if (typeof subSchema.items === 'object' && !Array.isArray(subSchema.items)) {
            const typeComposers = ensureTypeComposers(subSchema.items);
            return {
              input: typeComposers.input.getTypePlural(),
              output: typeComposers.output.getTypePlural(),
            };
          }
          if (subSchema.contains) {
            // Scalars cannot be in union type
            const typeComposer = getGenericJSONScalar(false).getTypePlural();
            return {
              input: typeComposer,
              output: typeComposer,
            };
          }
          if (typeof subSchema.items === 'object' && Array.isArray(subSchema.items)) {
            const existingItems = [...(subSchema.items as any)];
            if (subSchema.additionalItems) {
              existingItems.push(subSchema.additionalItems);
            }
            const { input: inputTypeComposer, output: outputTypeComposer } = getUnionTypeComposers(existingItems);
            return {
              input: inputTypeComposer.getTypePlural(),
              output: outputTypeComposer.getTypePlural(),
            };
          }
          // If it doesn't have any clue
          {
            const typeComposer = getGenericJSONScalar(false).getTypePlural();
            return {
              input: typeComposer,
              output: typeComposer,
            };
          }
        case 'object':
          const fieldMap: any = {};
          let inputFieldMap: any = {};
          if (subSchema.properties) {
            for (const propertyName in subSchema.properties) {
              const typeComposers = ensureTypeComposers(subSchema.properties[propertyName]);
              if (!typeComposers) {
                console.log({ subSchema });
                throw new Error(`Type composers cannot be found for ${path} ${propertyName}`);
              }
              const { input, output } = typeComposers;
              fieldMap[propertyName] = {
                type: subSchema.required?.includes(propertyName) ? output.getTypeNonNull() : output,
              };
              inputFieldMap[propertyName] = {
                type: subSchema.required?.includes(propertyName) ? input?.getTypeNonNull() : input,
              };
            }
          }

          if (subSchema.additionalProperties) {
            fieldMap.additionalProperties = {
              type: GraphQLJSON,
              resolve: (root: any) => root,
            };
            inputFieldMap = {};
          }

          if (subSchema.title === '_schema') {
            return {
              output: schemaComposer,
            };
          }

          if (subSchema.title === 'Query') {
            const typeComposer = schemaComposer.Query;
            typeComposer.addFields(fieldMap);
            return {
              output: typeComposer,
            };
          }

          if (subSchema.title === 'Mutation') {
            const typeComposer = schemaComposer.Mutation;
            typeComposer.addFields(fieldMap);
            return {
              output: typeComposer,
            };
          }

          if (subSchema.title === 'Subscription') {
            const typeComposer = schemaComposer.Subscription;
            typeComposer.addFields(fieldMap);
            return {
              output: typeComposer,
            };
          }

          if (subSchema.title === 'QueryInput') {
            for (const fieldName in inputFieldMap) {
              schemaComposer.Query.addFieldArgs(fieldName, {
                input: {
                  type: inputFieldMap[fieldName].type.getTypeNonNull(),
                },
              });
            }
          }

          if (subSchema.title === 'MutationInput') {
            for (const fieldName in inputFieldMap) {
              schemaComposer.Mutation.addFieldArgs(fieldName, {
                input: {
                  type: inputFieldMap[fieldName].type.getTypeNonNull(),
                },
              });
            }
          }

          if (subSchema.title === 'SubscriptionInput') {
            for (const fieldName in inputFieldMap) {
              schemaComposer.Subscription.addFieldArgs(fieldName, {
                input: {
                  type: inputFieldMap[fieldName].type.getTypeNonNull(),
                },
              });
            }
          }

          const output =
            Object.keys(fieldMap).length === 0
              ? getGenericJSONScalar(false)
              : schemaComposer.createObjectTC({
                  name: getValidTypeName(false),
                  description: subSchema.description,
                  fields: fieldMap,
                  extensions: {
                    validate,
                  },
                });

          const input =
            Object.keys(inputFieldMap).length === 0
              ? getGenericJSONScalar(true)
              : schemaComposer.createInputTC({
                  name: getValidTypeName(true),
                  description: subSchema.description,
                  fields: inputFieldMap,
                });

          return {
            input,
            output,
          };
      }
    };
    const result = getTypeComposer();
    subSchemaTypeComposerMap.set(subSchema, result);
    pathTypeComposerMap.set(path, result);
    return result;
  }) as any;
}
