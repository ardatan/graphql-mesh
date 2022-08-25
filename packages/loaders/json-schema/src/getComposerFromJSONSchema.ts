/* eslint-disable no-case-declarations */
import {
  AnyTypeComposer,
  EnumTypeComposerValueConfigDefinition,
  InputTypeComposer,
  InputTypeComposerFieldConfigAsObjectDefinition,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfigMapDefinition,
  ScalarTypeComposer,
  SchemaComposer,
  ListComposer,
  UnionTypeComposer,
  isSomeInputTypeComposer,
  ComposeOutputType,
  ComposeInputType,
  EnumTypeComposer,
  InterfaceTypeComposer,
} from 'graphql-compose';
import {
  getNamedType,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLScalarType,
  GraphQLString,
  GraphQLType,
  isNonNullType,
} from 'graphql';
import {
  GraphQLBigInt,
  GraphQLDateTime,
  GraphQLEmailAddress,
  GraphQLJSON,
  GraphQLUUID,
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
  default?: any;
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
      if (typeof subSchema === 'boolean' || subSchema.title === 'Any') {
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
          default: subSchema.default,
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
            default: subSchema.default,
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
            default: subSchema.default,
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
            default: subSchema.default,
          };
        }
        case 'boolean': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLBoolean);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
            default: subSchema.default,
          };
        }
        case 'null': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLVoid);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
            default: subSchema.default,
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
              default: subSchema.default,
            };
          }
          const typeComposer = schemaComposer.getAnyTC(GraphQLInt);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
            default: subSchema.default,
          };
        }
        case 'number': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLFloat);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
            default: subSchema.default,
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
              default: subSchema.default,
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
                default: subSchema.default,
              };
            }
            case 'time': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLTime);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
                default: subSchema.default,
              };
            }
            case 'email': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLEmailAddress);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
                default: subSchema.default,
              };
            }
            case 'ipv4': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLIPv4);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
                default: subSchema.default,
              };
            }
            case 'ipv6': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLIPv6);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
                default: subSchema.default,
              };
            }
            case 'uri': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLURL);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
                default: subSchema.default,
              };
            }
            case 'uuid': {
              const typeComposer = schemaComposer.getAnyTC(GraphQLUUID);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
                default: subSchema.default,
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
                default: subSchema.default,
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
              default: subSchema.default,
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
              default: subSchema.default,
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
              if (path.startsWith('/properties/subscription')) {
                return {
                  output: schemaComposer.Subscription,
                  ...subSchema,
                };
              }
              subSchema.title = 'Subscription_';
              break;
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

      if (subSchema.properties || subSchema.allOf || subSchema.anyOf || subSchema.additionalProperties) {
        if (subSchema.title === 'Any') {
          const typeComposer = schemaComposer.getAnyTC(GraphQLJSON);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
            default: subSchema.default,
          };
        }
        const config = {
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
        };
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
          output: subSchema.discriminator
            ? schemaComposer.createInterfaceTC({
                ...config,
                resolveType(root: any) {
                  return root[subSchema.discriminator];
                },
              })
            : schemaComposer.createObjectTC(config),
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

      return subSchema;
    },
    leave(subSchemaAndTypeComposers: JSONSchemaObject & TypeComposers, { path }) {
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
            default: subSchemaAndTypeComposers.default,
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

      const fieldMap: ObjectTypeComposerFieldConfigMapDefinition<any, any> = {};
      const inputFieldMap: Record<string, InputTypeComposerFieldConfigAsObjectDefinition & { type: any }> = {};
      let isList = false;

      if (subSchemaAndTypeComposers.allOf) {
        let ableToUseGraphQLInputObjectType = true;
        for (const maybeTypeComposers of subSchemaAndTypeComposers.allOf as any) {
          let { input: inputTypeComposer, output: outputTypeComposer } = maybeTypeComposers;

          if (inputTypeComposer instanceof ListComposer) {
            isList = true;
            inputTypeComposer = inputTypeComposer.ofType;
          }

          if (inputTypeComposer instanceof ScalarTypeComposer || inputTypeComposer instanceof EnumTypeComposer) {
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
            if (outputTypeComposer instanceof InterfaceTypeComposer) {
              (subSchemaAndTypeComposers.output as ObjectTypeComposer).addInterface(outputTypeComposer);
            }
            const typeElemFieldMap = outputTypeComposer.getFields();
            for (const fieldName in typeElemFieldMap) {
              const field = typeElemFieldMap[fieldName];
              fieldMap[fieldName] = field;
            }
          }
        }

        (subSchemaAndTypeComposers.output as ObjectTypeComposer).addFields(fieldMap);
        (subSchemaAndTypeComposers.output as ObjectTypeComposer).setExtensions({
          validateWithJSONSchema,
          examples: subSchemaAndTypeComposers.examples,
          default: subSchemaAndTypeComposers.default,
        });

        if (ableToUseGraphQLInputObjectType) {
          (subSchemaAndTypeComposers.input as InputTypeComposer).addFields(inputFieldMap);
          (subSchemaAndTypeComposers.input as InputTypeComposer).setExtensions({
            examples: subSchemaAndTypeComposers.examples,
            default: subSchemaAndTypeComposers.default,
          });
        } else {
          subSchemaAndTypeComposers.input = schemaComposer.getAnyTC(GraphQLJSON);
        }
      }

      if (subSchemaAndTypeComposers.anyOf) {
        // It should not have `required` because it is `anyOf` not `allOf`
        let ableToUseGraphQLInputObjectType = true;
        for (const typeComposers of subSchemaAndTypeComposers.anyOf as any) {
          let { input: inputTypeComposer, output: outputTypeComposer } = typeComposers;
          if (inputTypeComposer instanceof ListComposer || outputTypeComposer instanceof ListComposer) {
            isList = true;
            inputTypeComposer = inputTypeComposer.ofType;
            outputTypeComposer = outputTypeComposer.ofType;
          }
          if (inputTypeComposer instanceof ScalarTypeComposer || inputTypeComposer instanceof EnumTypeComposer) {
            ableToUseGraphQLInputObjectType = false;
          } else {
            if (!inputTypeComposer.getFields) {
              console.log(inputTypeComposer);
            }
            const inputTypeElemFieldMap = inputTypeComposer.getFields();
            for (const fieldName in inputTypeElemFieldMap) {
              // In case of conflict set it to JSON
              // TODO: But instead we can convert that field into a oneOf of all possible types
              if (inputFieldMap[fieldName]) {
                inputFieldMap[fieldName] = {
                  type: schemaComposer.getAnyTC(GraphQLJSON) as ComposeInputType,
                };
              } else {
                const field = inputTypeElemFieldMap[fieldName];
                inputFieldMap[fieldName] = isNonNullType(field.type.getType())
                  ? {
                      ...field,
                      type: () => field.type.ofType,
                    }
                  : field;
              }
            }
          }

          if (outputTypeComposer instanceof ScalarTypeComposer) {
            const typeName = outputTypeComposer.getTypeName();
            // In case of conflict set it to JSON
            // TODO: But instead we can convert that field into a union of all possible types
            if (fieldMap[typeName] && (fieldMap[typeName] as any).type.getTypeName() !== typeName) {
              fieldMap[typeName] = {
                type: schemaComposer.getAnyTC(GraphQLJSON) as ComposeOutputType<any>,
              };
            } else {
              fieldMap[typeName] = {
                type: outputTypeComposer,
                resolve: root => root,
              };
            }
          } else {
            const typeElemFieldMap = outputTypeComposer.getFields();
            for (const fieldName in typeElemFieldMap) {
              // In case of conflict set it to JSON
              // TODO: But instead we can convert that field into a union of all possible types
              const field = typeElemFieldMap[fieldName];
              const existingField: any = fieldMap[fieldName];
              fieldMap[fieldName] = {
                ...field,
                type: () => {
                  const fieldType = field.type.getType();
                  const namedType = getNamedType(fieldType as GraphQLType);
                  if (existingField) {
                    const existingFieldType = existingField.type();
                    const existingNamedType = getNamedType(existingFieldType as GraphQLType);
                    if (existingNamedType.name !== namedType.name) {
                      return schemaComposer.getAnyTC(GraphQLJSON) as ComposeOutputType<any>;
                    }
                  }
                  return field.type.getType();
                },
              };
            }
          }
        }

        (subSchemaAndTypeComposers.output as ObjectTypeComposer).addFields(fieldMap);
        (subSchemaAndTypeComposers.output as ObjectTypeComposer).setExtensions({
          validateWithJSONSchema,
          examples: subSchemaAndTypeComposers.examples,
          default: subSchemaAndTypeComposers.default,
        });

        if (ableToUseGraphQLInputObjectType) {
          (subSchemaAndTypeComposers.input as InputTypeComposer).addFields(inputFieldMap);
          (subSchemaAndTypeComposers.input as InputTypeComposer).setExtensions({
            examples: subSchemaAndTypeComposers.examples,
            default: subSchemaAndTypeComposers.default,
          });
        } else {
          subSchemaAndTypeComposers.input = schemaComposer.getAnyTC(GraphQLJSON);
        }
      }

      switch (subSchemaAndTypeComposers.type) {
        case 'object':
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
                  subSchemaAndTypeComposers.properties[propertyName]?.default ||
                  subSchemaAndTypeComposers.properties[propertyName]?.extensions?.default ||
                  subSchemaAndTypeComposers.properties[propertyName]?.input?.default,
              };
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
            } else if (Object.keys(fieldMap).length > 0) {
              fieldMap.additionalProperties = {
                type: GraphQLJSON,
                resolve: (root: any) => root,
              };
            } else {
              const typeComposer = schemaComposer.getAnyTC(GraphQLJSON);
              schemaComposer.delete((subSchemaAndTypeComposers.input as ObjectTypeComposer)?.getTypeName?.());
              schemaComposer.delete((subSchemaAndTypeComposers.output as ObjectTypeComposer)?.getTypeName?.());
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchemaAndTypeComposers.description,
                nullable: subSchemaAndTypeComposers.nullable,
                default: subSchemaAndTypeComposers.default,
              };
            }
          }

          if (subSchemaAndTypeComposers.title in rootInputTypeNameComposerMap) {
            const typeComposer = rootInputTypeNameComposerMap[subSchemaAndTypeComposers.title]();
            for (const fieldName in inputFieldMap) {
              let inputTC = inputFieldMap[fieldName].type();
              if ('ofType' in inputTC) {
                inputTC = inputTC.ofType;
              }
              typeComposer.addFieldArgs(fieldName, inputTC.getFields());
            }
            return {
              output: typeComposer,
            };
          }

          let output = subSchemaAndTypeComposers.output;
          if (Object.keys(fieldMap).length === 0) {
            output = schemaComposer.getAnyTC(GraphQLJSON);
          } else if ('addFields' in output) {
            (output as ObjectTypeComposer).addFields(fieldMap);
          }
          let input = subSchemaAndTypeComposers.input;
          if (Object.keys(inputFieldMap).length === 0) {
            input = schemaComposer.getAnyTC(GraphQLJSON);
          } else if (input != null && 'addFields' in input) {
            (input as InputTypeComposer).addFields(inputFieldMap);
          }

          if (isList) {
            input = input.List;
            output = (output as ObjectTypeComposer).List;
          }
          return {
            input,
            output,
            nullable: subSchemaAndTypeComposers.nullable,
            default: subSchemaAndTypeComposers.default,
          };
      }

      if (subSchemaAndTypeComposers.input || subSchemaAndTypeComposers.output) {
        return {
          input: subSchemaAndTypeComposers.input,
          output: subSchemaAndTypeComposers.output,
          description: subSchemaAndTypeComposers.description,
          nullable: subSchemaAndTypeComposers.nullable,
          default: subSchemaAndTypeComposers.default,
        };
      } else {
        logger.debug(`GraphQL Type cannot be created for this JSON Schema definition;`, {
          subSchema: subSchemaOnly,
          path,
        });
        const typeComposer = schemaComposer.getAnyTC(GraphQLJSON);
        return {
          input: typeComposer,
          output: typeComposer,
          description: subSchemaAndTypeComposers.description,
          nullable: subSchemaAndTypeComposers.nullable,
          default: subSchemaAndTypeComposers.default,
        };
      }
    },
  });
}
