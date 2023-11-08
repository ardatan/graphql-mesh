/* eslint-disable no-case-declarations */
import {
  getNamedType,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLString,
  GraphQLType,
  isNonNullType,
} from 'graphql';
import {
  AnyTypeComposer,
  ComposeInputType,
  ComposeOutputType,
  Directive,
  EnumTypeComposer,
  EnumTypeComposerValueConfigDefinition,
  InputTypeComposer,
  InputTypeComposerFieldConfigAsObjectDefinition,
  InputTypeComposerFieldConfigMap,
  InterfaceTypeComposer,
  isSomeInputTypeComposer,
  ListComposer,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfigMap,
  ObjectTypeComposerFieldConfigMapDefinition,
  ScalarTypeComposer,
  SchemaComposer,
  ThunkComposer,
  UnionTypeComposer,
} from 'graphql-compose';
import {
  GraphQLBigInt,
  GraphQLByte,
  GraphQLDateTime,
  GraphQLEmailAddress,
  GraphQLIPv4,
  GraphQLIPv6,
  GraphQLJSON,
  GraphQLNegativeFloat,
  GraphQLNegativeInt,
  GraphQLNonEmptyString,
  GraphQLNonNegativeFloat,
  GraphQLNonNegativeInt,
  GraphQLNonPositiveFloat,
  GraphQLNonPositiveInt,
  GraphQLPositiveFloat,
  GraphQLPositiveInt,
  GraphQLTime,
  GraphQLTimestamp,
  GraphQLURL,
  GraphQLUUID,
} from 'graphql-scalars';
import { JSONSchema, JSONSchemaObject, JSONSchemaVisitor, visitJSONSchema } from 'json-machete';
import { Logger } from '@graphql-mesh/types';
import { sanitizeNameForGraphQL } from '@graphql-mesh/utils';
import {
  DictionaryDirective,
  DiscriminatorDirective,
  EnumDirective,
  ExampleDirective,
  FlattenDirective,
  LengthDirective,
  OneOfDirective,
  RegExpDirective,
  ResolveRootDirective,
  ResolveRootFieldDirective,
  TypeScriptDirective,
} from './directives.js';
import { getJSONSchemaStringFormatScalarMap } from './getJSONSchemaStringFormatScalarMap.js';
import { getUnionTypeComposers } from './getUnionTypeComposers.js';
import { getValidTypeName } from './getValidTypeName.js';
import { GraphQLFile, GraphQLVoid } from './scalars.js';
import { CustomSchemaComposer } from './types.js';

export interface TypeComposers {
  input?: AnyTypeComposer<any>;
  output: AnyTypeComposer<any> | SchemaComposer;
  // Information for future field definitions
  description?: string;
  nullable?: boolean;
  default?: any;
  readOnly?: boolean;
  writeOnly?: boolean;
  flatten?: boolean;
  deprecated?: boolean;
}

export function getComposerFromJSONSchema(
  schema: JSONSchema,
  logger: Logger,
  customSchemaComposer?: CustomSchemaComposer,
): Promise<TypeComposers> {
  const schemaComposer = new SchemaComposer();
  const formatScalarMap = getJSONSchemaStringFormatScalarMap();
  const rootInputTypeNameComposerMap: Record<string, () => ObjectTypeComposer<any>> = {
    QueryInput: () => schemaComposer.Query,
    MutationInput: () => schemaComposer.Mutation,
    SubscriptionInput: () => schemaComposer.Subscription,
  };

  return visitJSONSchema(schema, {
    enter(subSchema: JSONSchema, { path, visitedSubschemaResultMap }) {
      if (typeof customSchemaComposer === 'function') {
        const result = customSchemaComposer(subSchema, schemaComposer);
        if (result) {
          return result;
        }
      }
      if (typeof subSchema === 'boolean' || subSchema.title === 'Any') {
        const typeComposer = schemaComposer.getAnyTC(GraphQLJSON);
        return subSchema
          ? {
              input: typeComposer,
              output: typeComposer,
            }
          : undefined;
      }
      if (!subSchema) {
        throw new Error(`Something is wrong with ${path}`);
      }
      if (subSchema.type === 'array') {
        if (
          subSchema.items != null &&
          typeof subSchema.items === 'object' &&
          Object.keys(subSchema.items).length > 0
        ) {
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
          const typeComposer = schemaComposer.getAnyTC(GraphQLJSON).getTypePlural();
          return {
            input: typeComposer,
            output: typeComposer,
            nullable: subSchema.nullable,
            readOnly: subSchema.readOnly,
            writeOnly: subSchema.writeOnly,
            default: subSchema.default,
            deprecated: subSchema.deprecated,
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
            readOnly: subSchema.readOnly,
            writeOnly: subSchema.writeOnly,
            default: subSchema.default,
            deprecated: subSchema.deprecated,
          };
        }
      }
      if (subSchema.pattern) {
        let typeScriptType: string;
        switch (subSchema.type) {
          case 'number':
            typeScriptType = 'number';
            break;
          case 'integer':
            if (subSchema.format === 'int64') {
              typeScriptType = 'bigint';
            } else {
              typeScriptType = 'number';
            }
            break;
          default:
            typeScriptType = 'string';
            break;
        }
        schemaComposer.addDirective(RegExpDirective);
        schemaComposer.addDirective(TypeScriptDirective);
        const typeComposer = schemaComposer.createScalarTC({
          name: getValidTypeName({
            schemaComposer,
            isInput: false,
            subSchema,
          }),
          directives: [
            {
              name: 'regexp',
              args: {
                pattern: subSchema.pattern,
              },
            },
            {
              name: 'typescript',
              args: {
                type: typeScriptType,
              },
            },
          ],
        });
        return {
          input: typeComposer,
          output: typeComposer,
          nullable: subSchema.nullable,
          readOnly: subSchema.readOnly,
          writeOnly: subSchema.writeOnly,
          deprecated: subSchema.deprecated,
        };
      }
      if (subSchema.const) {
        const scalarTypeName = getValidTypeName({
          schemaComposer,
          isInput: false,
          subSchema,
        });
        schemaComposer.addDirective(EnumDirective);
        schemaComposer.addDirective(TypeScriptDirective);
        schemaComposer.addDirective(ExampleDirective);
        const typeComposer = schemaComposer.createEnumTC({
          name: scalarTypeName,
          values: {
            [sanitizeNameForGraphQL(subSchema.const.toString())]: {
              directives: [
                {
                  name: 'enum',
                  args: {
                    value: JSON.stringify(subSchema.const),
                  },
                },
              ],
            },
          },
          directives: [
            {
              name: 'typescript',
              args: {
                type: JSON.stringify(subSchema.const),
              },
            },
            {
              name: 'example',
              args: {
                value: subSchema.const,
              },
            },
          ],
          extensions: {
            default: subSchema.const,
          },
        });
        return {
          input: typeComposer,
          output: typeComposer,
          nullable: subSchema.nullable,
          readOnly: subSchema.readOnly,
          writeOnly: subSchema.writeOnly,
          deprecated: subSchema.deprecated,
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
          schemaComposer.addDirective(EnumDirective);
          // Falsy values are ignored by GraphQL
          // eslint-disable-next-line no-unneeded-ternary
          const enumValue = value || value === 0 ? value : value?.toString();
          const directives: Directive[] = [];
          if (enumValue !== enumKey) {
            directives.push({
              name: 'enum',
              args: {
                value: JSON.stringify(enumValue),
              },
            });
          }
          values[enumKey] = {
            directives,
            value: enumValue,
          };
        }
        const directives = [];
        if (subSchema.examples?.length) {
          schemaComposer.addDirective(ExampleDirective);
          for (const example of subSchema.examples) {
            directives.push({
              name: 'example',
              args: {
                value: example,
              },
            });
          }
        }
        const typeComposer = schemaComposer.createEnumTC({
          name: getValidTypeName({
            schemaComposer,
            isInput: false,
            subSchema,
          }),
          values,
          description: subSchema.description,
          directives,
          extensions: {
            default: subSchema.default,
          },
        });
        return {
          input: typeComposer,
          output: typeComposer,
          nullable: subSchema.nullable,
          readOnly: subSchema.readOnly,
          writeOnly: subSchema.writeOnly,
          default: subSchema.default,
          deprecated: subSchema.deprecated,
        };
      }

      if (Array.isArray(subSchema.type)) {
        const validTypes = subSchema.type.filter((typeName: string) => typeName !== 'null');
        if (validTypes.length === 1) {
          subSchema.type = validTypes[0];
          // continue with the single type
        } else {
          const typeComposer = schemaComposer.getAnyTC(GraphQLJSON);
          return {
            input: typeComposer,
            output: typeComposer,
            nullable: subSchema.nullable,
            readOnly: subSchema.readOnly,
            writeOnly: subSchema.writeOnly,
            default: subSchema.default,
            deprecated: subSchema.deprecated,
          };
        }
      }

      if (subSchema.format) {
        switch (subSchema.format) {
          case 'byte': {
            const typeComposer = schemaComposer.getAnyTC(GraphQLByte);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          case 'binary': {
            const typeComposer = schemaComposer.getAnyTC(GraphQLFile);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          case 'date-time': {
            const typeComposer = schemaComposer.getAnyTC(GraphQLDateTime);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              readOnly: subSchema.readOnly,
              writeOnly: subSchema.writeOnly,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          case 'time': {
            const typeComposer = schemaComposer.getAnyTC(GraphQLTime);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              readOnly: subSchema.readOnly,
              writeOnly: subSchema.writeOnly,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          case 'email': {
            const typeComposer = schemaComposer.getAnyTC(GraphQLEmailAddress);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              readOnly: subSchema.readOnly,
              writeOnly: subSchema.writeOnly,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          case 'ipv4': {
            const typeComposer = schemaComposer.getAnyTC(GraphQLIPv4);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              readOnly: subSchema.readOnly,
              writeOnly: subSchema.writeOnly,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          case 'ipv6': {
            const typeComposer = schemaComposer.getAnyTC(GraphQLIPv6);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              readOnly: subSchema.readOnly,
              writeOnly: subSchema.writeOnly,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          case 'uri': {
            const typeComposer = schemaComposer.getAnyTC(GraphQLURL);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              readOnly: subSchema.readOnly,
              writeOnly: subSchema.writeOnly,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          case 'uuid': {
            const typeComposer = schemaComposer.getAnyTC(GraphQLUUID);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              readOnly: subSchema.readOnly,
              writeOnly: subSchema.writeOnly,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          case 'unix-time': {
            const typeComposer = schemaComposer.createScalarTC(GraphQLTimestamp);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              readOnly: subSchema.readOnly,
              writeOnly: subSchema.writeOnly,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          case 'int64': {
            const typeComposer = schemaComposer.createScalarTC(GraphQLBigInt);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              readOnly: subSchema.readOnly,
              writeOnly: subSchema.writeOnly,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          case 'int32': {
            const typeComposer = schemaComposer.createScalarTC(GraphQLInt);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              readOnly: subSchema.readOnly,
              writeOnly: subSchema.writeOnly,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          case 'decimal':
          case 'float': {
            const typeComposer = schemaComposer.createScalarTC(GraphQLFloat);
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              readOnly: subSchema.readOnly,
              writeOnly: subSchema.writeOnly,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          default: {
            const formatScalar = formatScalarMap.get(subSchema.format);
            if (formatScalar) {
              const typeComposer = schemaComposer.getAnyTC(formatScalar);
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchema.description,
                nullable: subSchema.nullable,
                readOnly: subSchema.readOnly,
                writeOnly: subSchema.writeOnly,
                default: subSchema.default,
                deprecated: subSchema.deprecated,
              };
            }
          }
        }
      }

      if (subSchema.minimum === 0) {
        const typeComposer = schemaComposer.getAnyTC(
          subSchema.type === 'integer' ? GraphQLNonNegativeInt : GraphQLNonNegativeFloat,
        );
        return {
          input: typeComposer,
          output: typeComposer,
          description: subSchema.description,
          nullable: subSchema.nullable,
          readOnly: subSchema.readOnly,
          writeOnly: subSchema.writeOnly,
          default: subSchema.default,
          deprecated: subSchema.deprecated,
        };
      } else if (subSchema.minimum > 0) {
        const typeComposer = schemaComposer.getAnyTC(
          subSchema.type === 'integer' ? GraphQLPositiveInt : GraphQLPositiveFloat,
        );
        return {
          input: typeComposer,
          output: typeComposer,
          description: subSchema.description,
          nullable: subSchema.nullable,
          readOnly: subSchema.readOnly,
          writeOnly: subSchema.writeOnly,
          default: subSchema.default,
          deprecated: subSchema.deprecated,
        };
      }
      if (subSchema.maximum === 0) {
        const typeComposer = schemaComposer.getAnyTC(
          subSchema.type === 'integer' ? GraphQLNonPositiveInt : GraphQLNonPositiveFloat,
        );
        return {
          input: typeComposer,
          output: typeComposer,
          description: subSchema.description,
          nullable: subSchema.nullable,
          readOnly: subSchema.readOnly,
          writeOnly: subSchema.writeOnly,
          default: subSchema.default,
          deprecated: subSchema.deprecated,
        };
      } else if (subSchema.maximum < 0) {
        const typeComposer = schemaComposer.getAnyTC(
          subSchema.type === 'integer' ? GraphQLNegativeInt : GraphQLNegativeFloat,
        );
        return {
          input: typeComposer,
          output: typeComposer,
          description: subSchema.description,
          nullable: subSchema.nullable,
          readOnly: subSchema.readOnly,
          writeOnly: subSchema.writeOnly,
          default: subSchema.default,
          deprecated: subSchema.deprecated,
        };
      }
      if (
        subSchema.maximum > Number.MAX_SAFE_INTEGER ||
        subSchema.minimum < Number.MIN_SAFE_INTEGER
      ) {
        const typeComposer = schemaComposer.getAnyTC(GraphQLBigInt);
        return {
          input: typeComposer,
          output: typeComposer,
          description: subSchema.description,
          nullable: subSchema.nullable,
          readOnly: subSchema.readOnly,
          writeOnly: subSchema.writeOnly,
          default: subSchema.default,
          deprecated: subSchema.deprecated,
        };
      }

      switch (subSchema.type as any) {
        case 'boolean': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLBoolean);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
            readOnly: subSchema.readOnly,
            writeOnly: subSchema.writeOnly,
            default: subSchema.default,
            deprecated: subSchema.deprecated,
          };
        }
        case 'null': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLVoid);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
            readOnly: subSchema.readOnly,
            writeOnly: subSchema.writeOnly,
            default: subSchema.default,
            deprecated: subSchema.deprecated,
          };
        }
        case 'integer': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLInt);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
            readOnly: subSchema.readOnly,
            writeOnly: subSchema.writeOnly,
            default: subSchema.default,
            deprecated: subSchema.deprecated,
          };
        }
        case 'number': {
          const typeComposer = schemaComposer.getAnyTC(GraphQLFloat);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
            readOnly: subSchema.readOnly,
            writeOnly: subSchema.writeOnly,
            default: subSchema.default,
            deprecated: subSchema.deprecated,
          };
        }
        case 'string': {
          if (subSchema.minLength === 1 && subSchema.maxLength == null) {
            const tc = schemaComposer.getAnyTC(GraphQLNonEmptyString);
            return {
              input: tc,
              output: tc,
              description: subSchema.description,
              nullable: subSchema.nullable,
              readOnly: subSchema.readOnly,
              writeOnly: subSchema.writeOnly,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          if (subSchema.minLength || subSchema.maxLength) {
            schemaComposer.addDirective(LengthDirective);
            const typeComposer = schemaComposer.createScalarTC({
              name: getValidTypeName({
                schemaComposer,
                isInput: false,
                subSchema,
              }),
              description: subSchema.description,
              directives: [
                {
                  name: 'length',
                  args: {
                    min: subSchema.minLength,
                    max: subSchema.maxLength,
                  },
                },
              ],
            });
            return {
              input: typeComposer,
              output: typeComposer,
              description: subSchema.description,
              nullable: subSchema.nullable,
              readOnly: subSchema.readOnly,
              writeOnly: subSchema.writeOnly,
              default: subSchema.default,
              deprecated: subSchema.deprecated,
            };
          }
          const typeComposer = schemaComposer.getAnyTC(GraphQLString);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
            readOnly: subSchema.readOnly,
            writeOnly: subSchema.writeOnly,
            default: subSchema.default,
            deprecated: subSchema.deprecated,
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
            case 'Subscription': {
              if (path === '/properties/subscription') {
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
      }
      if (subSchema.oneOf && !subSchema.properties) {
        schemaComposer.addDirective(OneOfDirective);
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
        const extensions: Record<string, any> = {};
        if (subSchema.$comment?.startsWith('statusCodeOneOfIndexMap:')) {
          const statusCodeOneOfIndexMapStr = subSchema.$comment.replace(
            'statusCodeOneOfIndexMap:',
            '',
          );
          const statusCodeOneOfIndexMap = JSON.parse(statusCodeOneOfIndexMapStr);
          if (statusCodeOneOfIndexMap) {
            extensions.statusCodeOneOfIndexMap = statusCodeOneOfIndexMap;
          }
        }
        const output = schemaComposer.createUnionTC({
          name: getValidTypeName({
            schemaComposer,
            isInput: false,
            subSchema,
          }),
          description: subSchema.description,
          types: [],
          extensions,
        });
        return {
          input,
          output,
          ...subSchema,
        };
      }

      if (
        subSchema.properties ||
        subSchema.allOf ||
        subSchema.anyOf ||
        subSchema.additionalProperties
      ) {
        if (subSchema.title === 'Any') {
          const typeComposer = schemaComposer.getAnyTC(GraphQLJSON);
          return {
            input: typeComposer,
            output: typeComposer,
            description: subSchema.description,
            nullable: subSchema.nullable,
            readOnly: subSchema.readOnly,
            writeOnly: subSchema.writeOnly,
            default: subSchema.default,
            deprecated: subSchema.deprecated,
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
          directives: [] as Directive[],
          extensions: {
            default: subSchema.default,
          },
        };

        if (subSchema.examples?.length) {
          schemaComposer.addDirective(ExampleDirective);
          for (const example of subSchema.examples) {
            config.directives.push({
              name: 'example',
              args: {
                value: example,
              },
            });
          }
        }

        if (subSchema.discriminator?.propertyName) {
          schemaComposer.addDirective(DiscriminatorDirective);
        }
        const directives: Directive[] = [];
        if (subSchema.examples?.length) {
          schemaComposer.addDirective(ExampleDirective);
          for (const example of subSchema.examples) {
            directives.push({
              name: 'example',
              args: {
                value: example,
              },
            });
          }
        }
        return {
          input: schemaComposer.createInputTC({
            name: getValidTypeName({
              schemaComposer,
              isInput: true,
              subSchema,
            }),
            description: subSchema.description,
            fields: {},
            directives,
            extensions: {
              default: subSchema.default,
            },
          }),
          output: subSchema.discriminator
            ? schemaComposer.createInterfaceTC(config)
            : schemaComposer.createObjectTC(config),
          ...subSchema,
          ...(subSchema.properties ? { properties: { ...subSchema.properties } } : {}),
          ...(subSchema.allOf ? { allOf: [...subSchema.allOf] } : {}),
          ...(subSchema.additionalProperties
            ? {
                additionalProperties:
                  subSchema.additionalProperties === true
                    ? true
                    : { ...subSchema.additionalProperties },
              }
            : {}),
          ...(subSchema.discriminatorMapping
            ? { discriminatorMapping: { ...subSchema.discriminatorMapping } }
            : {}),
        };
      }

      return subSchema;
    },
    leave(subSchemaAndTypeComposers: JSONSchemaObject & TypeComposers, { path }) {
      // const validateWithJSONSchema = getValidateFnForSchemaPath(ajv, path, schema);
      const subSchemaOnly: JSONSchemaObject = {
        ...subSchemaAndTypeComposers,
        input: undefined,
        output: undefined,
      };
      if (subSchemaOnly.discriminator?.propertyName) {
        schemaComposer.addDirective(DiscriminatorDirective);
        const discriminatorArgs: {
          field: string;
          mapping?: Record<string, string>;
        } = {
          field: subSchemaOnly.discriminator.propertyName,
        };
        if (subSchemaOnly.discriminator.mapping) {
          const mappingByName: Record<string, string> = {};
          for (const discriminatorValue in subSchemaOnly.discriminatorMapping) {
            const discType = subSchemaOnly.discriminatorMapping[discriminatorValue];
            mappingByName[discriminatorValue] = discType.output.getTypeName();
          }
          discriminatorArgs.mapping = mappingByName;
        }
        (subSchemaAndTypeComposers.output as InterfaceTypeComposer).setDirectiveByName(
          'discriminator',
          discriminatorArgs,
        );
      }
      if (subSchemaAndTypeComposers.oneOf && !subSchemaAndTypeComposers.properties) {
        const isPlural = (subSchemaAndTypeComposers.oneOf as TypeComposers[]).some(
          ({ output }) => output instanceof ListComposer,
        );
        if (isPlural) {
          const { input, output, flatten } = getUnionTypeComposers({
            schemaComposer,
            typeComposersList: (subSchemaAndTypeComposers.oneOf as any).map(
              ({ input, output }: any) => ({
                input: input.ofType || input,
                output: output.ofType || output,
              }),
            ) as any[],
            subSchemaAndTypeComposers,
            logger,
          });
          return {
            input: input.getTypePlural(),
            output:
              output instanceof ListComposer
                ? output
                : (output as ObjectTypeComposer).getTypePlural(),
            nullable: subSchemaAndTypeComposers.nullable,
            default: subSchemaAndTypeComposers.default,
            readOnly: subSchemaAndTypeComposers.readOnly,
            writeOnly: subSchemaAndTypeComposers.writeOnly,
            flatten,
            deprecated: subSchemaAndTypeComposers.deprecated,
          };
        }
        return getUnionTypeComposers({
          schemaComposer,
          typeComposersList: subSchemaAndTypeComposers.oneOf as any[],
          subSchemaAndTypeComposers,
          logger,
        });
      }

      const fieldMap: ObjectTypeComposerFieldConfigMapDefinition<any, any> = {};
      const inputFieldMap: Record<
        string,
        InputTypeComposerFieldConfigAsObjectDefinition & { type: any }
      > = {};
      let isList = false;

      if (subSchemaAndTypeComposers.allOf) {
        let ableToUseGraphQLInputObjectType = true;
        for (const maybeTypeComposers of subSchemaAndTypeComposers.allOf as any) {
          let { input: inputTypeComposer, output: outputTypeComposer } = maybeTypeComposers;

          if (inputTypeComposer instanceof ListComposer) {
            isList = true;
            inputTypeComposer = inputTypeComposer.ofType;
          }

          if (outputTypeComposer instanceof ListComposer) {
            isList = true;
            outputTypeComposer = outputTypeComposer.ofType;
          }

          if (
            inputTypeComposer instanceof ScalarTypeComposer ||
            inputTypeComposer instanceof EnumTypeComposer
          ) {
            ableToUseGraphQLInputObjectType = false;
          } else {
            const inputTypeElemFieldMap = inputTypeComposer.getFields();
            for (const fieldName in inputTypeElemFieldMap) {
              const newInputField = inputTypeElemFieldMap[fieldName] as any;
              const existingInputField = inputFieldMap[fieldName] as any;
              if (!existingInputField) {
                inputFieldMap[fieldName] = newInputField;
              } else {
                /*
                  If the new field collides with an existing field:

                    - If both the existing and the new field have an input type composer, combine their subfields
                    - Otherwise, replace the existing field with the new one
                */
                const existingInputFieldUnwrappedTC =
                  typeof existingInputField.type?.getUnwrappedTC === 'function'
                    ? existingInputField.type.getUnwrappedTC()
                    : undefined;
                const newInputFieldUnwrappedTC =
                  typeof newInputField.type?.getUnwrappedTC === 'function'
                    ? newInputField.type.getUnwrappedTC()
                    : undefined;
                if (
                  existingInputFieldUnwrappedTC instanceof InputTypeComposer &&
                  newInputFieldUnwrappedTC instanceof InputTypeComposer
                ) {
                  deepMergeInputTypeComposerFields(
                    existingInputFieldUnwrappedTC.getFields(),
                    newInputFieldUnwrappedTC.getFields(),
                  );
                } else {
                  inputFieldMap[fieldName] = newInputField;
                }
              }
            }
          }

          if (isSomeInputTypeComposer(outputTypeComposer)) {
            schemaComposer.addDirective(ResolveRootDirective);
            fieldMap[outputTypeComposer.getTypeName()] = {
              type: outputTypeComposer as any,
              directives: [
                {
                  name: 'resolveRoot',
                },
              ],
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
              (subSchemaAndTypeComposers.output as ObjectTypeComposer).addInterface(
                outputTypeComposer,
              );
              schemaComposer.addSchemaMustHaveType(
                subSchemaAndTypeComposers.output as ObjectTypeComposer,
              );
            }

            const typeElemFieldMap = outputTypeComposer.getFields();
            for (const fieldName in typeElemFieldMap) {
              const newField = typeElemFieldMap[fieldName] as any;
              const existingField = fieldMap[fieldName] as any;
              if (!existingField) {
                fieldMap[fieldName] = newField;
              } else {
                /*
                  If the new field collides with an existing field:

                    - If both the existing and the new field have an object type composer, combine their subfields
                    - Otherwise, replace the existing field with the new one
                */
                const existingFieldUnwrappedTC =
                  typeof existingField.type?.getUnwrappedTC === 'function'
                    ? existingField.type.getUnwrappedTC()
                    : undefined;
                const newFieldUnwrappedTC =
                  typeof newField.type?.getUnwrappedTC === 'function'
                    ? newField.type.getUnwrappedTC()
                    : undefined;
                if (
                  existingFieldUnwrappedTC instanceof ObjectTypeComposer &&
                  newFieldUnwrappedTC instanceof ObjectTypeComposer
                ) {
                  deepMergeObjectTypeComposerFields(
                    existingFieldUnwrappedTC.getFields(),
                    newFieldUnwrappedTC.getFields(),
                  );
                } else {
                  fieldMap[fieldName] = newField;
                }
              }
            }
          }
        }

        if (subSchemaAndTypeComposers.examples?.length) {
          schemaComposer.addDirective(ExampleDirective);
          const directives =
            (subSchemaAndTypeComposers.output as ObjectTypeComposer).getDirectives() || [];
          for (const example of subSchemaAndTypeComposers.examples) {
            directives.push({
              name: 'example',
              args: {
                value: example,
              },
            });
          }
          (subSchemaAndTypeComposers.output as ObjectTypeComposer).setDirectives(directives);
        }

        (subSchemaAndTypeComposers.output as ObjectTypeComposer).addFields(fieldMap);
        (subSchemaAndTypeComposers.output as ObjectTypeComposer).setExtensions({
          // validateWithJSONSchema,
          default: subSchemaAndTypeComposers.default,
        });

        if (ableToUseGraphQLInputObjectType) {
          (subSchemaAndTypeComposers.input as InputTypeComposer).addFields(inputFieldMap);
          if (subSchemaAndTypeComposers.examples?.length) {
            schemaComposer.addDirective(ExampleDirective);
            const directives =
              (subSchemaAndTypeComposers.input as InputTypeComposer).getDirectives() || [];
            for (const example of subSchemaAndTypeComposers.examples) {
              directives.push({
                name: 'example',
                args: {
                  value: example,
                },
              });
            }
            (subSchemaAndTypeComposers.input as InputTypeComposer).setDirectives(directives);
          }
          (subSchemaAndTypeComposers.input as InputTypeComposer).setExtensions({
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
          if (
            inputTypeComposer instanceof ListComposer ||
            outputTypeComposer instanceof ListComposer
          ) {
            isList = true;
            inputTypeComposer = inputTypeComposer.ofType;
            outputTypeComposer = outputTypeComposer.ofType;
          }
          if (
            inputTypeComposer instanceof ScalarTypeComposer ||
            inputTypeComposer instanceof EnumTypeComposer
          ) {
            ableToUseGraphQLInputObjectType = false;
          } else {
            const inputTypeElemFieldMap = inputTypeComposer.getFields();
            for (const fieldName in inputTypeElemFieldMap) {
              // In case of conflict set it to JSON
              // TODO: But instead we can convert that field into a oneOf of all possible types
              if (inputFieldMap[fieldName]) {
                let existingType = inputFieldMap[fieldName].type;
                if (typeof existingType === 'function') {
                  existingType = existingType();
                }
                let newType = inputTypeElemFieldMap[fieldName].type;
                if (typeof newType === 'function') {
                  newType = newType();
                }
                const newTypeName = newType.getTypeName().replace('!', '');
                const existingTypeName = existingType.getTypeName().replace('!', '');
                if (existingTypeName !== newTypeName) {
                  if (newTypeName !== 'JSON') {
                    inputFieldMap[fieldName] = {
                      type: schemaComposer.getAnyTC(GraphQLJSON) as ComposeInputType,
                    };
                  }
                  if (existingTypeName === 'JSON') {
                    const field = inputTypeElemFieldMap[fieldName];
                    inputFieldMap[fieldName] = isNonNullType(field.type.getType())
                      ? {
                          ...field,
                          type: () => field.type.ofType,
                        }
                      : field;
                  }
                }
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
            if (fieldMap[typeName]) {
              const existingTypeName = (fieldMap[typeName] as any)?.type?.getTypeName();
              if (existingTypeName === 'JSON') {
                schemaComposer.addDirective(ResolveRootDirective);
                fieldMap[typeName] = {
                  type: outputTypeComposer,
                  directives: [
                    {
                      name: 'resolveRoot',
                    },
                  ],
                };
              }
              if (typeName !== 'JSON' && existingTypeName !== typeName) {
                fieldMap[typeName] = {
                  type: schemaComposer.getAnyTC(GraphQLJSON) as ComposeOutputType<any>,
                };
              }
            } else {
              schemaComposer.addDirective(ResolveRootDirective);
              fieldMap[typeName] = {
                type: outputTypeComposer,
                directives: [
                  {
                    name: 'resolveRoot',
                  },
                ],
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
                    const existingTypeName = existingNamedType.name;
                    const newTypeName = namedType.name;
                    if (existingTypeName !== 'JSON' && existingNamedType.name !== namedType.name) {
                      return schemaComposer.getAnyTC(GraphQLJSON) as ComposeOutputType<any>;
                    }
                    if (newTypeName === 'JSON') {
                      return existingFieldType;
                    }
                  }
                  return field.type.getType();
                },
              };
            }
          }
        }

        let outputTypeComposer = subSchemaAndTypeComposers.output;

        if ('ofType' in outputTypeComposer) {
          outputTypeComposer = outputTypeComposer.ofType;
        }

        (outputTypeComposer as ObjectTypeComposer).addFields(fieldMap);
        if (subSchemaAndTypeComposers.examples?.length) {
          schemaComposer.addDirective(ExampleDirective);
          const directives = (outputTypeComposer as ObjectTypeComposer).getDirectives() || [];
          for (const example of subSchemaAndTypeComposers.examples) {
            directives.push({
              name: 'example',
              args: {
                value: example,
              },
            });
          }
          (outputTypeComposer as ObjectTypeComposer).setDirectives(directives);
        }
        (outputTypeComposer as ObjectTypeComposer).setExtensions({
          // validateWithJSONSchema,
          default: subSchemaAndTypeComposers.default,
        });

        let inputTypeComposer = subSchemaAndTypeComposers.input;

        if ('ofType' in inputTypeComposer) {
          inputTypeComposer = inputTypeComposer.ofType;
        }

        if (ableToUseGraphQLInputObjectType) {
          (inputTypeComposer as InputTypeComposer).addFields(inputFieldMap);
          if (subSchemaAndTypeComposers.examples?.length) {
            schemaComposer.addDirective(ExampleDirective);
            const directives = (inputTypeComposer as InputTypeComposer).getDirectives() || [];
            for (const example of subSchemaAndTypeComposers.examples) {
              directives.push({
                name: 'example',
                args: {
                  value: example,
                },
              });
            }
            (inputTypeComposer as InputTypeComposer).setDirectives(directives);
          }
          (inputTypeComposer as InputTypeComposer).setExtensions({
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
              const fieldDirectives: Directive[] = [];
              if (propertyName !== fieldName) {
                schemaComposer.addDirective(ResolveRootFieldDirective);
                fieldDirectives.push({
                  name: 'resolveRootField',
                  args: {
                    field: propertyName,
                  },
                });
              }
              if (subSchemaAndTypeComposers.properties[propertyName].flatten) {
                schemaComposer.addDirective(FlattenDirective);
                fieldDirectives.push({
                  name: 'flatten',
                });
              }
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
                  if (subSchemaAndTypeComposers.properties[propertyName].writeOnly) {
                    nullable = true;
                  }
                  return !nullable ? typeComposers.output.getTypeNonNull() : typeComposers.output;
                },
                // Make sure you get the right property
                directives: fieldDirectives,
                description:
                  subSchemaAndTypeComposers.properties[propertyName].description ||
                  subSchemaAndTypeComposers.properties[propertyName].output?.description,
                deprecationReason: subSchemaAndTypeComposers.properties[propertyName].deprecated
                  ? 'deprecated'
                  : undefined,
              };
              const directives: Directive[] = [];
              if (fieldName !== propertyName) {
                schemaComposer.addDirective(ResolveRootFieldDirective);
                directives.push({
                  name: 'resolveRootField',
                  args: {
                    field: propertyName,
                  },
                });
              }
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
                  if (subSchemaAndTypeComposers.properties[propertyName].readOnly) {
                    nullable = true;
                  }
                  return !nullable ? typeComposers.input?.getTypeNonNull() : typeComposers.input;
                },
                directives,
                description:
                  subSchemaAndTypeComposers.properties[propertyName].description ||
                  subSchemaAndTypeComposers.properties[propertyName].input?.description,
                defaultValue:
                  subSchemaAndTypeComposers.properties[propertyName]?.default ||
                  subSchemaAndTypeComposers.properties[propertyName]?.extensions?.default ||
                  subSchemaAndTypeComposers.properties[propertyName]?.input?.default,
                // deprecationReason: subSchemaAndTypeComposers.properties[propertyName].deprecated ? 'deprecated' : undefined,
              };
            }
          }

          if (subSchemaAndTypeComposers.additionalProperties) {
            // Take a look later
            if (
              typeof subSchemaAndTypeComposers.additionalProperties === 'object' &&
              subSchemaAndTypeComposers.additionalProperties.output instanceof ObjectTypeComposer
            ) {
              const containerOutputTC = schemaComposer.createObjectTC({
                name: `${subSchemaAndTypeComposers.additionalProperties.output.getTypeName()}_entry`,
                fields: {
                  key: {
                    type: 'ID!',
                  },
                  value: {
                    type: subSchemaAndTypeComposers.additionalProperties.output,
                  },
                },
              });

              schemaComposer.addDirective(DictionaryDirective);
              fieldMap.additionalProperties = {
                type: containerOutputTC.List,
                directives: [
                  {
                    name: 'dictionary',
                  },
                ],
              };
            } else if (Object.keys(fieldMap).length > 0) {
              schemaComposer.addDirective(ResolveRootDirective);
              fieldMap.additionalProperties = {
                type: GraphQLJSON,
                directives: [
                  {
                    name: 'resolveRoot',
                  },
                ],
              };
            } else {
              const typeComposer = schemaComposer.getAnyTC(GraphQLJSON);
              schemaComposer.delete(
                (subSchemaAndTypeComposers.input as ObjectTypeComposer)?.getTypeName?.(),
              );
              schemaComposer.delete(
                (subSchemaAndTypeComposers.output as ObjectTypeComposer)?.getTypeName?.(),
              );
              return {
                input: typeComposer,
                output: typeComposer,
                description: subSchemaAndTypeComposers.description,
                nullable: subSchemaAndTypeComposers.nullable,
                default: subSchemaAndTypeComposers.default,
                readOnly: subSchemaAndTypeComposers.readOnly,
                writeOnly: subSchemaAndTypeComposers.writeOnly,
                deprecated: subSchemaAndTypeComposers.deprecated,
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
            if (subSchemaOnly.discriminatorMapping) {
              for (const discriminatorValue in subSchemaOnly.discriminatorMapping) {
                const discType = subSchemaOnly.discriminatorMapping[discriminatorValue];
                discType.output.addFields(fieldMap);
              }
            }
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
            readOnly: subSchemaAndTypeComposers.readOnly,
            writeOnly: subSchemaAndTypeComposers.writeOnly,
            deprecated: subSchemaAndTypeComposers.deprecated,
          };
      }

      if (subSchemaAndTypeComposers.input || subSchemaAndTypeComposers.output) {
        return {
          input: subSchemaAndTypeComposers.input,
          output: subSchemaAndTypeComposers.output,
          description: subSchemaAndTypeComposers.description,
          nullable: subSchemaAndTypeComposers.nullable,
          default: subSchemaAndTypeComposers.default,
          readOnly: subSchemaAndTypeComposers.readOnly,
          writeOnly: subSchemaAndTypeComposers.writeOnly,
          deprecated: subSchemaAndTypeComposers.deprecated,
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
          readOnly: subSchemaAndTypeComposers.readOnly,
          writeOnly: subSchemaAndTypeComposers.writeOnly,
          default: subSchemaAndTypeComposers.default,
          deprecated: subSchemaAndTypeComposers.deprecated,
        };
      }
    },
  });

  function deepMergeInputTypeComposerFields(
    existingInputTypeComposerFields: InputTypeComposerFieldConfigMap,
    newInputTypeComposerFields: InputTypeComposerFieldConfigMap,
  ) {
    for (const [newFieldKey, newFieldValue] of Object.entries(newInputTypeComposerFields)) {
      const existingFieldValue = existingInputTypeComposerFields[newFieldKey];
      if (!existingFieldValue) {
        existingInputTypeComposerFields[newFieldKey] = newFieldValue;
      } else {
        const existingFieldUnwrappedTC =
          typeof (existingFieldValue.type as ThunkComposer)?.getUnwrappedTC === 'function'
            ? (existingFieldValue.type as ThunkComposer)?.getUnwrappedTC()
            : undefined;
        const newFieldUnwrappedTC =
          typeof (newFieldValue.type as ThunkComposer).getUnwrappedTC === 'function'
            ? (newFieldValue.type as ThunkComposer).getUnwrappedTC()
            : undefined;
        if (
          existingFieldUnwrappedTC instanceof InputTypeComposer &&
          newFieldUnwrappedTC instanceof InputTypeComposer
        ) {
          deepMergeInputTypeComposerFields(
            existingFieldUnwrappedTC.getFields(),
            newFieldUnwrappedTC.getFields(),
          );
        } else {
          existingInputTypeComposerFields[newFieldKey] = newFieldValue;
        }
      }
    }
  }

  function deepMergeObjectTypeComposerFields(
    existingObjectTypeComposerFields: ObjectTypeComposerFieldConfigMap<any, any>,
    newObjectTypeComposerFields: ObjectTypeComposerFieldConfigMap<any, any>,
  ) {
    for (const [newFieldKey, newFieldValue] of Object.entries(newObjectTypeComposerFields)) {
      const existingFieldValue = existingObjectTypeComposerFields[newFieldKey];
      if (!existingFieldValue) {
        existingObjectTypeComposerFields[newFieldKey] = newFieldValue;
      } else {
        const existingFieldUnwrappedTC =
          typeof (existingFieldValue.type as ThunkComposer)?.getUnwrappedTC === 'function'
            ? (existingFieldValue.type as ThunkComposer)?.getUnwrappedTC()
            : undefined;
        const newFieldUnwrappedTC =
          typeof (newFieldValue.type as ThunkComposer).getUnwrappedTC === 'function'
            ? (newFieldValue.type as ThunkComposer).getUnwrappedTC()
            : undefined;
        if (
          existingFieldUnwrappedTC instanceof ObjectTypeComposer &&
          newFieldUnwrappedTC instanceof ObjectTypeComposer
        ) {
          deepMergeObjectTypeComposerFields(
            existingFieldUnwrappedTC.getFields(),
            newFieldUnwrappedTC.getFields(),
          );
        } else {
          existingObjectTypeComposerFields[newFieldKey] = newFieldValue;
        }
      }
    }
  }
}
