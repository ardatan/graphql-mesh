/* eslint-disable no-case-declarations */
import {
  AnyTypeComposer,
  EnumTypeComposerValueConfigDefinition,
  InputTypeComposer,
  InputTypeComposerFieldConfigAsObjectDefinition,
  InputTypeComposerFieldConfigMap,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfigMap,
  ObjectTypeComposerFieldConfigMapDefinition,
  ScalarTypeComposer,
  SchemaComposer,
  ListComposer,
  UnionTypeComposer,
  isSomeInputTypeComposer,
} from 'graphql-compose';
import {
  getNamedType,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLScalarType,
  GraphQLString,
  isNonNullType,
} from 'graphql';
import {
  GraphQLBigInt,
  GraphQLDateTime,
  GraphQLEmailAddress,
  GraphQLJSON,
  GraphQLIPv4,
  GraphQLIPv6,
  GraphQLTime,
  GraphQLURL,
  RegularExpression,
} from 'graphql-scalars';
import { sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import { Logger } from '@graphql-mesh/types';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { inspect, memoize1 } from '@graphql-tools/utils';
import { visitJSONSchema, JSONSchema } from 'json-machete';
import { getStringScalarWithMinMaxLength } from './getStringScalarWithMinMaxLength';
import { getJSONSchemaStringFormatScalarMap } from './getJSONSchemaStringFormatScalarMap';
import { getUnionTypeComposers } from './getUnionTypeComposers';
import { getValidTypeName } from './getValidTypeName';
import { getGenericJSONScalar } from './getGenericJSONScalar';
import { getValidateFnForSchemaPath } from './getValidateFnForSchemaPath';

const isListTC = memoize1(function isListTC(type: any): type is ListComposer {
  return type instanceof ListComposer;
});

const GraphQLVoid = new GraphQLScalarType({
  name: 'Void',
  description: 'Represents empty values',
  serialize: () => '',
  extensions: {
    codegenScalarType: 'void',
  },
});

interface TypeComposers {
  input?: AnyTypeComposer<any>;
  output: AnyTypeComposer<any> | SchemaComposer;
  description?: string;
}

const GraphQLFile = new GraphQLScalarType({
  name: 'File',
  extensions: {
    codegenScalarType: 'File',
  },
});

export function getComposerFromJSONSchema(
  schema: JSONSchema,
  logger: Logger,
  generateInterfaceFromSharedFields = false
): Promise<TypeComposers> {
  const schemaComposer = new SchemaComposer();
  const ajv = new Ajv({
    strict: false,
  });
  addFormats(ajv);
  const formatScalarMap = getJSONSchemaStringFormatScalarMap(ajv);
  const futureTasks = new Set<VoidFunction>();
  return visitJSONSchema(schema, function mutateFn(subSchema, { path }): any {
    logger?.debug(`Processing ${path} for GraphQL Schema`);
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
      const validateWithJSONSchema = getValidateFnForSchemaPath(ajv, path, schema);

      if (!subSchema) {
        throw new Error(`Something is wrong with ${path}`);
      }

      if (subSchema.pattern) {
        const scalarType = new RegularExpression(
          getValidTypeName({
            schemaComposer,
            isInput: false,
            subSchema,
          }),
          new RegExp(subSchema.pattern),
          {
            description: subSchema.description,
          }
        );
        const typeComposer = schemaComposer.getAnyTC(scalarType);
        return {
          input: typeComposer,
          output: typeComposer,
        };
      }
      if (subSchema.const) {
        const tsTypeName = JSON.stringify(subSchema.const);
        const scalarTypeName = getValidTypeName({
          schemaComposer,
          isInput: false,
          subSchema,
        });
        const scalarType = new RegularExpression(scalarTypeName, new RegExp(subSchema.const), {
          description: subSchema.description || `A field whose value is ${tsTypeName}`,
          errorMessage: (_r, v: string) => `Expected ${tsTypeName} but got ${JSON.stringify(v)}`,
        });
        scalarType.extensions = {
          codegenScalarType: tsTypeName,
        };
        const typeComposer = schemaComposer.createScalarTC(scalarType);
        return {
          input: typeComposer,
          output: typeComposer,
        };
      }
      if (subSchema.enum && subSchema.type !== 'boolean') {
        const values: Record<string, EnumTypeComposerValueConfigDefinition> = {};
        for (const value of subSchema.enum) {
          let enumKey = sanitizeNameForGraphQL(value.toString());
          if (enumKey === 'false' || enumKey === 'true' || enumKey === 'null') {
            enumKey = enumKey.toUpperCase();
          }
          if (typeof enumKey === 'string' && enumKey.length === 0) {
            enumKey = '_';
          }
          values[enumKey] = {
            // Falsy values are ignored by GraphQL
            // eslint-disable-next-line no-unneeded-ternary
            value: value ? value : value?.toString(),
          };
        }
        const typeComposer = schemaComposer.createEnumTC({
          name: getValidTypeName({
            schemaComposer,
            isInput: false,
            subSchema,
          }),
          values,
          description: subSchema.description,
          extensions: {
            examples: subSchema.examples,
            default: subSchema.default,
          },
        });
        return {
          input: typeComposer,
          output: typeComposer,
        };
      }

      if (subSchema.oneOf && !subSchema.properties) {
        let statusCodeOneOfIndexMap: Record<string, number> | undefined;
        if (subSchema.$comment?.startsWith('statusCodeOneOfIndexMap:')) {
          const statusCodeOneOfIndexMapStr = subSchema.$comment.replace('statusCodeOneOfIndexMap:', '');
          statusCodeOneOfIndexMap = JSON.parse(statusCodeOneOfIndexMapStr);
        }
        const isPlural = (subSchema.oneOf as TypeComposers[]).some(({ output }) => 'ofType' in output);
        if (isPlural) {
          const { input, output } = getUnionTypeComposers({
            schemaComposer,
            ajv,
            typeComposersList: (subSchema.oneOf as any).map(({ input, output }: any) => ({
              input: input.ofType || input,
              output: output.ofType || output,
            })) as any[],
            subSchema,
            generateInterfaceFromSharedFields,
            statusCodeOneOfIndexMap,
          });
          return {
            input: input.getTypePlural(),
            output: output.getTypePlural(),
          };
        }
        return getUnionTypeComposers({
          schemaComposer,
          ajv,
          typeComposersList: subSchema.oneOf as any[],
          subSchema,
          generateInterfaceFromSharedFields,
          statusCodeOneOfIndexMap,
        });
      }

      if (subSchema.allOf && !subSchema.properties) {
        const inputFieldMap: InputTypeComposerFieldConfigMap = {};
        const fieldMap: ObjectTypeComposerFieldConfigMap<any, any> = {};
        let ableToUseGraphQLInputObjectType = true;
        for (const maybeTypeComposers of subSchema.allOf as any) {
          const { input: inputTypeComposer, output: outputTypeComposer } = maybeTypeComposers;

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
            fieldMap[outputTypeComposer.getTypeName()] = {
              type: outputTypeComposer,
              resolve: root => root,
            };
          } else if (outputTypeComposer instanceof UnionTypeComposer) {
            const outputTCElems = outputTypeComposer.getTypes() as ObjectTypeComposer[];
            for (const outputTCElem of outputTCElems) {
              const outputTypeElemFieldMap = outputTCElem.getFields();
              for (const fieldName in outputTypeElemFieldMap) {
                const field = outputTypeElemFieldMap[fieldName];
                fieldMap[fieldName] = field;
              }
            }
          } else {
            const typeElemFieldMap = outputTypeComposer.getFields();
            for (const fieldName in typeElemFieldMap) {
              const field = typeElemFieldMap[fieldName];
              fieldMap[fieldName] = field;
            }
          }
        }

        let inputTypeComposer;
        const outputTypeComposer = schemaComposer.createObjectTC({
          name: getValidTypeName({
            schemaComposer,
            isInput: false,
            subSchema,
          }),
          description: subSchema.description,
          fields: fieldMap,
          extensions: {
            validateWithJSONSchema,
            examples: subSchema.examples,
            default: subSchema.default,
          },
        });

        if (ableToUseGraphQLInputObjectType) {
          inputTypeComposer = schemaComposer.createInputTC({
            name: getValidTypeName({
              schemaComposer,
              isInput: true,
              subSchema,
            }),
            description: subSchema.description,
            fields: inputFieldMap,
            extensions: {
              examples: subSchema.examples,
              default: subSchema.default,
            },
          });
        } else {
          inputTypeComposer = isSomeInputTypeComposer(outputTypeComposer)
            ? outputTypeComposer
            : getGenericJSONScalar({
                schemaComposer,
                isInput: true,
                subSchema,
                validateWithJSONSchema,
              });
        }

        return {
          input: inputTypeComposer,
          output: outputTypeComposer,
        };
      }

      if (subSchema.anyOf && !subSchema.properties) {
        if (subSchema.title === 'Any') {
          const genericJSONScalar = getGenericJSONScalar({
            schemaComposer,
            isInput: false,
            subSchema,
            validateWithJSONSchema,
          });
          return {
            input: genericJSONScalar,
            output: genericJSONScalar,
          };
        }
        // It should not have `required` because it is `anyOf` not `allOf`
        const inputFieldMap: InputTypeComposerFieldConfigMap = {};
        const fieldMap: ObjectTypeComposerFieldConfigMap<any, any> = {};
        let ableToUseGraphQLInputObjectType = true;
        for (const typeComposers of subSchema.anyOf as any) {
          const { input: inputTypeComposer, output: outputTypeComposer } = typeComposers;
          if (inputTypeComposer instanceof ScalarTypeComposer) {
            ableToUseGraphQLInputObjectType = false;
          } else {
            const inputTypeElemFieldMap = inputTypeComposer.getFields();
            for (const fieldName in inputTypeElemFieldMap) {
              const field = inputTypeElemFieldMap[fieldName];
              inputFieldMap[fieldName] = isNonNullType(field.type.getType())
                ? {
                    ...field,
                    type: () => field.type.ofType,
                  }
                : field;
            }
          }

          if (outputTypeComposer instanceof ScalarTypeComposer) {
            const typeName = outputTypeComposer.getTypeName();
            fieldMap[typeName] = {
              type: outputTypeComposer,
              resolve: root => root,
            };
          } else {
            const typeElemFieldMap = outputTypeComposer.getFields();
            for (const fieldName in typeElemFieldMap) {
              const field = typeElemFieldMap[fieldName];
              fieldMap[fieldName] = {
                type: () => getNamedType(field.type.getType()),
                ...field,
              };
            }
          }
        }

        let inputTypeComposer;
        const outputTypeComposer = schemaComposer.createObjectTC({
          name: getValidTypeName({
            schemaComposer,
            isInput: false,
            subSchema,
          }),
          description: subSchema.description,
          fields: fieldMap,
          extensions: {
            validateWithJSONSchema,
            examples: subSchema.examples,
            default: subSchema.default,
          },
        });

        if (ableToUseGraphQLInputObjectType) {
          inputTypeComposer = schemaComposer.createInputTC({
            name: getValidTypeName({
              schemaComposer,
              isInput: true,
              subSchema,
            }),
            description: subSchema.description,
            fields: inputFieldMap,
            extensions: {
              examples: subSchema.examples,
              default: subSchema.default,
            },
          });
        } else {
          inputTypeComposer = isSomeInputTypeComposer(outputTypeComposer)
            ? outputTypeComposer
            : getGenericJSONScalar({
                schemaComposer,
                isInput: true,
                subSchema,
                validateWithJSONSchema,
              });
        }

        return {
          input: inputTypeComposer,
          output: outputTypeComposer,
        };
      }

      if (Array.isArray(subSchema.type)) {
        const validTypes = subSchema.type.filter((typeName: string) => typeName !== 'null');
        if (validTypes.length === 1) {
          subSchema.type = validTypes[0];
          // continue with the single type
        } else {
          const typeComposer = schemaComposer.getAnyTC(GraphQLVoid);
          return {
            input: typeComposer,
            output: typeComposer,
          };
        }
      }

      switch (subSchema.type as any) {
        case 'file': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLFile);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
          };
        }
        case 'boolean': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLBoolean);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
          };
        }
        case 'null': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLVoid);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
          };
        }
        case 'integer': {
          if (subSchema.format === 'int64') {
            const typeComposer = schemaComposer.getAnyTC(GraphQLBigInt);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
            };
          }
          const typeComposer = schemaComposer.getAnyTC(GraphQLInt);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
          };
        }
        case 'number': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLFloat);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
          };
        }
        case 'string': {
          if (subSchema.minLength || subSchema.maxLength) {
            const scalarType = getStringScalarWithMinMaxLength({
              schemaComposer,
              subSchema,
            });
            const typeComposer = schemaComposer.getAnyTC(scalarType);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
            };
          }
          switch (subSchema.format) {
            case 'date-time': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLDateTime);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
              };
            }
            case 'time': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLTime);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
              };
            }
            case 'email': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLEmailAddress);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
              };
            }
            case 'ipv4': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLIPv4);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
              };
            }
            case 'ipv6': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLIPv6);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
              };
            }
            case 'uri': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLURL);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
              };
            }
            default: {
              const formatScalar = formatScalarMap.get(subSchema.format) || GraphQLString;
              const typeComposer = schemaComposer.getAnyTC(formatScalar);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
              };
            }
          }
        }
        case 'array':
          if (
            typeof subSchema.items === 'object' &&
            !Array.isArray(subSchema.items) &&
            Object.keys(subSchema.items).length > 0
          ) {
            const typeComposers = subSchema.items;
            return {
              input: typeComposers.input.getTypePlural(),
              output: typeComposers.output.getTypePlural(),
              description: subSchema.description,
            };
          }
          if (subSchema.contains) {
            // Scalars cannot be in union type
            const typeComposer = getGenericJSONScalar({
              schemaComposer,
              isInput: false,
              subSchema,
              validateWithJSONSchema,
            }).getTypePlural();
            return {
              input: typeComposer,
              output: typeComposer,
            };
          }
          if (typeof subSchema.items === 'object' && Array.isArray(subSchema.items)) {
            const existingItems = [...(subSchema.items as any)];
            /* TODO
            if (subSchema.additionalItems) {
              existingItems.push(subSchema.additionalItems);
            }
            */
            const { input: inputTypeComposer, output: outputTypeComposer } = getUnionTypeComposers({
              schemaComposer,
              ajv,
              typeComposersList: existingItems,
              subSchema,
              generateInterfaceFromSharedFields,
            });
            return {
              input: inputTypeComposer.getTypePlural(),
              output: outputTypeComposer.getTypePlural(),
              description: subSchema.description,
            };
          }
          // If it doesn't have any clue
          {
            // const typeComposer = getGenericJSONScalar({
            //   schemaComposer,
            //   isInput: false,
            //   subSchema,
            //   validateWithJSONSchema,
            // }).getTypePlural();
            const typeComposer = schemaComposer.getAnyTC(GraphQLJSON).getTypePlural();
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
            };
          }
        case 'object':
          const fieldMap: ObjectTypeComposerFieldConfigMapDefinition<any, any> = {};
          let inputFieldMap: Record<string, InputTypeComposerFieldConfigAsObjectDefinition & { type: any }> = {};
          if (subSchema.properties) {
            subSchema.type = 'object';
            for (const propertyName in subSchema.properties) {
              // TODO: needs to be fixed
              if (propertyName === 'additionalProperties') {
                continue;
              }
              const typeComposers = subSchema.properties[propertyName];
              const fieldName = sanitizeNameForGraphQL(propertyName);
              fieldMap[fieldName] = {
                type: () =>
                  subSchema.required?.includes(propertyName)
                    ? typeComposers.output.getTypeNonNull()
                    : typeComposers.output,
                // Make sure you get the right property
                resolve: root => {
                  const actualFieldObj = root[propertyName];
                  if (actualFieldObj != null) {
                    const isArray = Array.isArray(actualFieldObj);
                    const isListType = isListTC(typeComposers.output);
                    if (isListType && !isArray) {
                      return [actualFieldObj];
                    } else if (!isListTC(typeComposers.output) && isArray) {
                      return actualFieldObj[0];
                    }
                  }
                  return actualFieldObj;
                },
                description: typeComposers.description || typeComposers.output?.description,
              };
              inputFieldMap[fieldName] = {
                type: () =>
                  subSchema.required?.includes(propertyName)
                    ? typeComposers.input?.getTypeNonNull()
                    : typeComposers.input,
                // Let execution logic know what is the expected propertyName
                extensions: {
                  propertyName,
                },
                description: typeComposers.description || typeComposers.input?.description,
                defaultValue: typeComposers?.extensions?.default || typeComposers.input?.default,
              };
            }
          }

          if (subSchema.allOf) {
            for (const typeComposers of subSchema.allOf) {
              const outputTC: ObjectTypeComposer = (typeComposers as any).output;
              if (schemaComposer.isObjectType(outputTC)) {
                for (const outputFieldName of outputTC.getFieldNames()) {
                  if (!fieldMap[outputFieldName]) {
                    fieldMap[outputFieldName] = outputTC.getField(outputFieldName);
                  }
                }
              }
              const inputTC: InputTypeComposer = (typeComposers as any).input;
              if (schemaComposer.isInputObjectType(inputTC)) {
                for (const inputFieldName of inputTC.getFieldNames()) {
                  if (!inputFieldMap[inputFieldName]) {
                    inputFieldMap[inputFieldName] = inputTC.getField(inputFieldName);
                  }
                }
              }
            }
          }

          if (subSchema.additionalProperties) {
            if (
              typeof subSchema.additionalProperties === 'object' &&
              subSchema.additionalProperties.output instanceof ObjectTypeComposer
            ) {
              if (Object.keys(fieldMap).length === 0) {
                return subSchema.additionalProperties;
              } else {
                const outputTC: ObjectTypeComposer = (subSchema.additionalProperties as any).output;
                const outputTCFieldMap = outputTC.getFields();
                for (const fieldName in outputTCFieldMap) {
                  fieldMap[fieldName] = outputTCFieldMap[fieldName];
                }
                const inputTC: InputTypeComposer = (subSchema.additionalProperties as any).input;
                const inputTCFieldMap = inputTC.getFields();
                for (const fieldName in inputTCFieldMap) {
                  inputFieldMap[fieldName] = inputTCFieldMap[fieldName];
                }
              }
            } else {
              fieldMap.additionalProperties = {
                type: GraphQLJSON,
                resolve: (root: any) => root,
              };
              inputFieldMap = {};
            }
          }

          if (subSchema.title === '_schema') {
            futureTasks.forEach(futureTask => futureTask());
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

          const getCorrectInputFieldType = (fieldName: string) => {
            const inputType: InputTypeComposer | ListComposer<InputTypeComposer> = inputFieldMap[fieldName].type();
            const actualInputType = isListTC(inputType) ? inputType.ofType : inputType;
            if (!actualInputType.getFields) {
              return actualInputType;
            }
            const fieldMap = actualInputType.getFields();
            for (const fieldName in fieldMap) {
              const fieldConfig = fieldMap[fieldName];
              if (fieldConfig.type.getTypeName().endsWith('!')) {
                return inputType.getTypeNonNull();
              }
            }
            return inputType;
          };

          if (subSchema.title === 'QueryInput') {
            const typeComposer = schemaComposer.Query;
            for (const fieldName in inputFieldMap) {
              futureTasks.add(() =>
                typeComposer.addFieldArgs(fieldName, {
                  input: {
                    type: () => getCorrectInputFieldType(fieldName),
                    description: inputFieldMap[fieldName].description,
                  },
                })
              );
            }
            return {
              output: typeComposer,
            };
          }

          if (subSchema.title === 'MutationInput') {
            const typeComposer = schemaComposer.Mutation;
            for (const fieldName in inputFieldMap) {
              futureTasks.add(() =>
                typeComposer.addFieldArgs(fieldName, {
                  input: {
                    type: () => getCorrectInputFieldType(fieldName),
                    description: inputFieldMap[fieldName].description,
                  },
                })
              );
            }
            return {
              output: typeComposer,
            };
          }

          if (subSchema.title === 'SubscriptionInput') {
            const typeComposer = schemaComposer.Subscription;
            for (const fieldName in inputFieldMap) {
              futureTasks.add(() =>
                typeComposer.addFieldArgs(fieldName, {
                  input: {
                    type: () => getCorrectInputFieldType(fieldName),
                    description: inputFieldMap[fieldName].description,
                  },
                })
              );
            }
            return {
              output: typeComposer,
            };
          }

          const output =
            Object.keys(fieldMap).length === 0
              ? getGenericJSONScalar({
                  schemaComposer,
                  isInput: false,
                  subSchema,
                  validateWithJSONSchema,
                })
              : schemaComposer.createObjectTC({
                  name: getValidTypeName({
                    schemaComposer,
                    isInput: false,
                    subSchema,
                  }),
                  description: subSchema.description,
                  fields: fieldMap,
                  extensions: {
                    validateWithJSONSchema,
                    examples: subSchema.examples,
                    default: subSchema.default,
                  },
                });

          const input =
            Object.keys(inputFieldMap).length === 0
              ? getGenericJSONScalar({
                  schemaComposer,
                  isInput: true,
                  subSchema,
                  validateWithJSONSchema,
                })
              : schemaComposer.createInputTC({
                  name: getValidTypeName({
                    schemaComposer,
                    isInput: true,
                    subSchema,
                  }),
                  description: subSchema.description,
                  fields: inputFieldMap,
                  extensions: {
                    examples: subSchema.examples,
                    default: subSchema.default,
                  },
                });

          return {
            input,
            output,
          };
      }
      logger.warn(`GraphQL Type cannot be created for this JSON Schema definition;`, {
        subSchema,
        path
      });
      const typeComposer = schemaComposer.getAnyTC(GraphQLJSON);
      return {
        input: typeComposer,
        output: typeComposer,
      };
    };
    const result = getTypeComposer();
    return result;
  });
}
