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
import { memoize1 } from '@graphql-tools/utils';
import { visitJSONSchema, JSONSchema, JSONSchemaObject } from 'json-machete';
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

export interface TypeComposers {
  input?: AnyTypeComposer<any>;
  output: AnyTypeComposer<any> | SchemaComposer;
  // Information for future field definitions
  description?: string;
  nullable?: boolean;
}

const GraphQLFile = new GraphQLScalarType({
  name: 'File',
  extensions: {
    codegenScalarType: 'File',
  },
});

export function getComposerFromJSONSchema(schema: JSONSchema, logger: Logger): Promise<TypeComposers> {
  const schemaComposer = new SchemaComposer();
  const ajv = new Ajv({
    strict: false,
  });
  addFormats(ajv);
  const formatScalarMap = getJSONSchemaStringFormatScalarMap(ajv);
  const rootInputTypeNameComposerMap = {
    QueryInput: () => schemaComposer.Query,
    MutationInput: () => schemaComposer.Mutation,
    SubscriptionInput: () => schemaComposer.Subscription,
  };

  return visitJSONSchema(schema, {
    enter(subSchema: JSONSchema, { path, visitedSubschemaResultMap }) {
      logger?.debug(`Entering ${path} for GraphQL Schema`);
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
          nullable: subSchema.nullable,
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
          nullable: subSchema.nullable,
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
          nullable: subSchema.nullable,
        };
      }

      if (Array.isArray(subSchema.type)) {
        const validTypes = subSchema.type.filter((typeName: string) => typeName !== 'null');
        if (validTypes.length === 1) {
          subSchema.type = validTypes[0];
          // continue with the single type
        } else if (validTypes.length === 0) {
          const typeComposer = schemaComposer.getAnyTC(GraphQLVoid);
          return {
            input: typeComposer,
            output: typeComposer,
            nullable: subSchema.nullable,
          };
        } else {
          const typeComposer = getGenericJSONScalar({
            isInput: true,
            subSchema,
            schemaComposer,
            validateWithJSONSchema,
          });
          return {
            input: typeComposer,
            output: typeComposer,
            nullable: subSchema.nullable,
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
            nullable: subSchema.nullable,
          };
        }
        case 'boolean': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLBoolean);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
          };
        }
        case 'null': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLVoid);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
          };
        }
        case 'integer': {
          if (subSchema.format === 'int64') {
            const typeComposer = schemaComposer.getAnyTC(GraphQLBigInt);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
            };
          }
          const typeComposer = schemaComposer.getAnyTC(GraphQLInt);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
          };
        }
        case 'number': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLFloat);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
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
              nullable: subSchema.nullable,
            };
          }
          switch (subSchema.format) {
            case 'date-time': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLDateTime);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
              };
            }
            case 'time': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLTime);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
              };
            }
            case 'email': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLEmailAddress);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
              };
            }
            case 'ipv4': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLIPv4);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
              };
            }
            case 'ipv6': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLIPv6);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
              };
            }
            case 'uri': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLURL);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
              };
            }
            default: {
              const formatScalar = formatScalarMap.get(subSchema.format) || GraphQLString;
              const typeComposer = schemaComposer.getAnyTC(formatScalar);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
              };
            }
          }
        }
        case 'array':
          if (typeof subSchema.items === 'object' && Object.keys(subSchema.items).length > 0) {
            return {
              // These are filled after enter
              get input() {
                const typeComposers = visitedSubschemaResultMap.get(subSchema.items as any);
                return typeComposers.input.getTypePlural();
              },
              get output() {
                const typeComposers = visitedSubschemaResultMap.get(subSchema.items as any);
                return typeComposers.output.getTypePlural();
              },
              ...subSchema,
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
              nullable: subSchema.nullable,
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
              nullable: subSchema.nullable,
            };
          }
        case 'object': {
          switch (subSchema.title) {
            case '_schema':
              return {
                output: schemaComposer,
                ...subSchema,
              };
            case 'Query':
              return {
                output: schemaComposer.Query,
                ...subSchema,
              };
            case 'Mutation':
              return {
                output: schemaComposer.Mutation,
                ...subSchema,
              };
            case 'Subscription':
              return {
                output: schemaComposer.Subscription,
                ...subSchema,
              };
          }
          if (subSchema.properties || subSchema.allOf || subSchema.additionalProperties) {
            return {
              input: schemaComposer.createInputTC({
                name: getValidTypeName({
                  schemaComposer,
                  isInput: true,
                  subSchema,
                }),
                description: subSchema.description,
                fields: {},
                extensions: {
                  examples: subSchema.examples,
                  default: subSchema.default,
                },
              }),
              output: schemaComposer.createObjectTC({
                name: getValidTypeName({
                  schemaComposer,
                  isInput: false,
                  subSchema,
                }),
                description: subSchema.description,
                fields: {},
                extensions: {
                  validateWithJSONSchema,
                  examples: subSchema.examples,
                  default: subSchema.default,
                },
              }),
              ...subSchema,
              ...(subSchema.properties ? { properties: { ...subSchema.properties } } : {}),
              ...(subSchema.allOf ? { allOf: [...subSchema.allOf] } : {}),
              ...(subSchema.additionalProperties
                ? {
                    additionalProperties:
                      subSchema.additionalProperties === true ? true : { ...subSchema.additionalProperties },
                  }
                : {}),
            };
          }
        }
      }

      if (subSchema.oneOf && !subSchema.properties) {
        let statusCodeOneOfIndexMap: Record<string, number> | undefined;
        if (subSchema.$comment?.startsWith('statusCodeOneOfIndexMap:')) {
          const statusCodeOneOfIndexMapStr = subSchema.$comment.replace('statusCodeOneOfIndexMap:', '');
          statusCodeOneOfIndexMap = JSON.parse(statusCodeOneOfIndexMapStr);
        }
        const input = schemaComposer.createInputTC({
          name: getValidTypeName({
            schemaComposer,
            isInput: true,
            subSchema,
          }),
          fields: {},
          directives: [
            {
              name: 'oneOf',
            },
          ],
        });
        const output = schemaComposer.createUnionTC({
          name: getValidTypeName({
            schemaComposer,
            isInput: false,
            subSchema,
          }),
          description: subSchema.description,
          types: [],
          extensions: {
            statusCodeOneOfIndexMap,
          },
        });
        return {
          input,
          output,
          ...subSchema,
        };
      }
      if (!subSchema.properties && (subSchema.anyOf || subSchema.allOf)) {
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
            nullable: subSchema.nullable,
          };
        }
        const input = schemaComposer.createInputTC({
          name: getValidTypeName({
            schemaComposer,
            isInput: true,
            subSchema,
          }),
          description: subSchema.description,
          fields: {},
          extensions: {
            examples: subSchema.examples,
            default: subSchema.default,
          },
        });
        const output = schemaComposer.createObjectTC({
          name: getValidTypeName({
            schemaComposer,
            isInput: false,
            subSchema,
          }),
          description: subSchema.description,
          fields: {},
          extensions: {
            validateWithJSONSchema,
            examples: subSchema.examples,
            default: subSchema.default,
          },
        });
        return {
          input,
          output,
          ...subSchema,
        };
      }
      return subSchema;
    },
    leave(subSchemaAndTypeComposers: JSONSchemaObject & TypeComposers, { path }) {
      logger?.debug(`Leaving ${path} for GraphQL Schema`);
      const validateWithJSONSchema = getValidateFnForSchemaPath(ajv, path, schema);
      const subSchemaOnly: JSONSchemaObject = {
        ...subSchemaAndTypeComposers,
        input: undefined,
        output: undefined,
      };
      if (subSchemaAndTypeComposers.oneOf && !subSchemaAndTypeComposers.properties) {
        const isPlural = (subSchemaAndTypeComposers.oneOf as TypeComposers[]).some(({ output }) => 'ofType' in output);
        if (isPlural) {
          const { input, output } = getUnionTypeComposers({
            schemaComposer,
            ajv,
            typeComposersList: (subSchemaAndTypeComposers.oneOf as any).map(({ input, output }: any) => ({
              input: input.ofType || input,
              output: output.ofType || output,
            })) as any[],
            subSchemaAndTypeComposers,
            logger,
          });
          return {
            input: input.getTypePlural(),
            output: output.getTypePlural(),
            nullable: subSchemaAndTypeComposers.nullable,
          };
        }
        return getUnionTypeComposers({
          schemaComposer,
          ajv,
          typeComposersList: subSchemaAndTypeComposers.oneOf as any[],
          subSchemaAndTypeComposers,
          logger,
        });
      }

      if (subSchemaAndTypeComposers.allOf && !subSchemaAndTypeComposers.properties) {
        const inputFieldMap: InputTypeComposerFieldConfigMap = {};
        const fieldMap: ObjectTypeComposerFieldConfigMap<any, any> = {};
        let ableToUseGraphQLInputObjectType = true;
        for (const maybeTypeComposers of subSchemaAndTypeComposers.allOf as any) {
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

          if (isSomeInputTypeComposer(outputTypeComposer)) {
            fieldMap[outputTypeComposer.getTypeName()] = {
              type: outputTypeComposer as any,
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

        let inputTypeComposer = subSchemaAndTypeComposers.input;
        (subSchemaAndTypeComposers.output as ObjectTypeComposer).addFields(fieldMap);
        (subSchemaAndTypeComposers.output as ObjectTypeComposer).setExtensions({
          validateWithJSONSchema,
          examples: subSchemaAndTypeComposers.examples,
          default: subSchemaAndTypeComposers.default,
        });

        if (ableToUseGraphQLInputObjectType) {
          (inputTypeComposer as InputTypeComposer).addFields(inputFieldMap);
          (inputTypeComposer as InputTypeComposer).setExtensions({
            examples: subSchemaAndTypeComposers.examples,
            default: subSchemaAndTypeComposers.default,
          });
        } else {
          schemaComposer.delete(inputTypeComposer);
          inputTypeComposer = getGenericJSONScalar({
            schemaComposer,
            isInput: true,
            subSchema: subSchemaOnly,
            validateWithJSONSchema,
          });
        }

        return {
          input: inputTypeComposer,
          output: subSchemaAndTypeComposers.output,
          nullable: subSchemaAndTypeComposers.nullable,
        };
      }

      if (subSchemaAndTypeComposers.anyOf && !subSchemaAndTypeComposers.properties) {
        // It should not have `required` because it is `anyOf` not `allOf`
        const inputFieldMap: InputTypeComposerFieldConfigMap = {};
        const fieldMap: ObjectTypeComposerFieldConfigMap<any, any> = {};
        let ableToUseGraphQLInputObjectType = true;
        for (const typeComposers of subSchemaAndTypeComposers.anyOf as any) {
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

        let inputTypeComposer = subSchemaAndTypeComposers.input;
        (subSchemaAndTypeComposers.output as ObjectTypeComposer).addFields(fieldMap);
        (subSchemaAndTypeComposers.output as ObjectTypeComposer).setExtensions({
          validateWithJSONSchema,
          examples: subSchemaAndTypeComposers.examples,
          default: subSchemaAndTypeComposers.default,
        });

        if (ableToUseGraphQLInputObjectType) {
          (inputTypeComposer as InputTypeComposer).addFields(inputFieldMap);
          (inputTypeComposer as InputTypeComposer).setExtensions({
            examples: subSchemaAndTypeComposers.examples,
            default: subSchemaAndTypeComposers.default,
          });
        } else {
          schemaComposer.delete(inputTypeComposer);
          inputTypeComposer = getGenericJSONScalar({
            schemaComposer,
            isInput: true,
            subSchema: subSchemaOnly,
            validateWithJSONSchema,
          });
        }

        return {
          input: inputTypeComposer,
          output: subSchemaAndTypeComposers.output,
          nullable: subSchemaAndTypeComposers.nullable,
        };
      }

      switch (subSchemaAndTypeComposers.type) {
        case 'object':
          const fieldMap: ObjectTypeComposerFieldConfigMapDefinition<any, any> = {};
          let inputFieldMap: Record<string, InputTypeComposerFieldConfigAsObjectDefinition & { type: any }> = {};
          if (subSchemaAndTypeComposers.properties) {
            for (const propertyName in subSchemaAndTypeComposers.properties) {
              // TODO: needs to be fixed
              if (propertyName === 'additionalProperties') {
                continue;
              }
              const fieldName = sanitizeNameForGraphQL(propertyName);
              fieldMap[fieldName] = {
                type: () => {
                  const typeComposers = subSchemaAndTypeComposers.properties[propertyName];
                  let nullable = true;
                  if (subSchemaAndTypeComposers.required?.includes(propertyName)) {
                    nullable = false;
                  }
                  // Nullable has more priority
                  if (typeComposers.nullable === false) {
                    nullable = false;
                  }
                  if (typeComposers.nullable === true) {
                    nullable = true;
                  }
                  return !nullable ? typeComposers.output.getTypeNonNull() : typeComposers.output;
                },
                // Make sure you get the right property
                resolve: root => {
                  const typeComposers = subSchemaAndTypeComposers.properties[propertyName];
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
                description:
                  subSchemaAndTypeComposers.properties[propertyName].description ||
                  subSchemaAndTypeComposers.properties[propertyName].output?.description,
              };
              inputFieldMap[fieldName] = {
                type: () => {
                  const typeComposers = subSchemaAndTypeComposers.properties[propertyName];
                  let nullable = true;
                  if (subSchemaAndTypeComposers.required?.includes(propertyName)) {
                    nullable = false;
                  }
                  // Nullable has more priority
                  if (typeComposers.nullable === false) {
                    nullable = false;
                  }
                  if (typeComposers.nullable === true) {
                    nullable = true;
                  }
                  return !nullable ? typeComposers.input?.getTypeNonNull() : typeComposers.input;
                },
                // Let execution logic know what is the expected propertyName
                extensions: {
                  propertyName,
                },
                description:
                  subSchemaAndTypeComposers.properties[propertyName].description ||
                  subSchemaAndTypeComposers.properties[propertyName].input?.description,
                defaultValue:
                  subSchemaAndTypeComposers.properties[propertyName]?.extensions?.default ||
                  subSchemaAndTypeComposers.properties[propertyName].input?.default,
              };
            }
          }

          if (subSchemaAndTypeComposers.allOf) {
            for (const typeComposers of subSchemaAndTypeComposers.allOf) {
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

          if (subSchemaAndTypeComposers.additionalProperties) {
            if (
              typeof subSchemaAndTypeComposers.additionalProperties === 'object' &&
              subSchemaAndTypeComposers.additionalProperties.output instanceof ObjectTypeComposer
            ) {
              if (Object.keys(fieldMap).length === 0) {
                return subSchemaAndTypeComposers.additionalProperties;
              } else {
                const outputTC: ObjectTypeComposer = (subSchemaAndTypeComposers.additionalProperties as any).output;
                const outputTCFieldMap = outputTC.getFields();
                for (const fieldName in outputTCFieldMap) {
                  fieldMap[fieldName] = outputTCFieldMap[fieldName];
                }
                const inputTC: InputTypeComposer = (subSchemaAndTypeComposers.additionalProperties as any).input;
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

          if (subSchemaAndTypeComposers.title in rootInputTypeNameComposerMap) {
            const typeComposer = rootInputTypeNameComposerMap[subSchemaAndTypeComposers.title]();
            for (const fieldName in inputFieldMap) {
              typeComposer.addFieldArgs(fieldName, {
                input: {
                  type: () => getCorrectInputFieldType(fieldName),
                  description: inputFieldMap[fieldName].description,
                },
              });
            }
            return {
              output: typeComposer,
            };
          }

          let output = subSchemaAndTypeComposers.output;
          if (Object.keys(fieldMap).length === 0) {
            output = getGenericJSONScalar({
              schemaComposer,
              isInput: false,
              subSchema: subSchemaOnly,
              validateWithJSONSchema,
            });
          } else if ('addFields' in output) {
            (output as ObjectTypeComposer).addFields(fieldMap);
          }
          let input = subSchemaAndTypeComposers.input;
          if (Object.keys(inputFieldMap).length === 0) {
            input = getGenericJSONScalar({
              schemaComposer,
              isInput: true,
              subSchema: subSchemaOnly,
              validateWithJSONSchema,
            });
          } else if (input != null && 'addFields' in input) {
            (input as InputTypeComposer).addFields(inputFieldMap);
          }
          return {
            input,
            output,
            nullable: subSchemaAndTypeComposers.nullable,
          };
      }

      if (subSchemaAndTypeComposers.input || subSchemaAndTypeComposers.output) {
        return {
          input: subSchemaAndTypeComposers.input,
          output: subSchemaAndTypeComposers.output,
          description: subSchemaAndTypeComposers.description,
          nullable: subSchemaAndTypeComposers.nullable,
        };
      } else {
        logger.warn(`GraphQL Type cannot be created for this JSON Schema definition;`, {
          subSchema: subSchemaOnly,
          path,
        });
        const typeComposer = schemaComposer.getAnyTC(GraphQLJSON);
        return {
          input: typeComposer,
          output: typeComposer,
          nullable: subSchemaAndTypeComposers.nullable,
        };
      }
    },
  });
}
