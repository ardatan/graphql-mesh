/* eslint-disable no-case-declarations */
import type { GraphQLScalarType, GraphQLType } from 'graphql';
import {
  getNamedType,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLString,
  isNonNullType,
} from 'graphql';
import type {
  AnyTypeComposer,
  ComposeInputType,
  ComposeOutputType,
  Directive,
  EnumTypeComposerValueConfigDefinition,
  InputTypeComposerFieldConfigAsObjectDefinition,
  ObjectTypeComposerFieldConfigMapDefinition,
  ThunkComposer,
} from 'graphql-compose';
import {
  EnumTypeComposer,
  InputTypeComposer,
  InterfaceTypeComposer,
  isSomeInputTypeComposer,
  ListComposer,
  ObjectTypeComposer,
  ScalarTypeComposer,
  SchemaComposer,
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
import type { JSONSchema, JSONSchemaObject } from 'json-machete';
import { visitJSONSchema } from 'json-machete';
import type { Logger } from '@graphql-mesh/types';
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

const formatScalarMapWithoutAjv: Record<string, GraphQLScalarType> = {
  byte: GraphQLByte,
  binary: GraphQLFile,
  'date-time': GraphQLDateTime,
  time: GraphQLTime,
  email: GraphQLEmailAddress,
  ipv4: GraphQLIPv4,
  ipv6: GraphQLIPv6,
  uri: GraphQLURL,
  uuid: GraphQLUUID,
  'unix-time': GraphQLTimestamp,
  int64: GraphQLBigInt,
  int32: GraphQLInt,
  decimal: GraphQLFloat,
  float: GraphQLFloat,
};

export interface GetComposerFromJSONSchemaOpts {
  subgraphName: string;
  schema: JSONSchema;
  logger: Logger;
  getScalarForFormat?: (format: string) => GraphQLScalarType | void;
}

const deepMergedInputTypeComposerFields = new WeakMap<
  InputTypeComposer<any>,
  WeakSet<InputTypeComposer<any>>
>();

function deepMergeInputTypeComposerFields(
  existingInputTypeComposer: InputTypeComposer<any>,
  newInputTypeComposer: InputTypeComposer<any>,
) {
  let mergedInputTypes = deepMergedInputTypeComposerFields.get(existingInputTypeComposer);
  if (!mergedInputTypes) {
    mergedInputTypes = new WeakSet();
    deepMergedInputTypeComposerFields.set(existingInputTypeComposer, mergedInputTypes);
  }
  if (mergedInputTypes.has(newInputTypeComposer)) {
    return;
  }
  mergedInputTypes.add(newInputTypeComposer);
  const existingInputTypeComposerFields = existingInputTypeComposer.getFields();
  const newInputTypeComposerFields = newInputTypeComposer.getFields();
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
        deepMergeInputTypeComposerFields(existingFieldUnwrappedTC, newFieldUnwrappedTC);
      } else {
        existingInputTypeComposerFields[newFieldKey] = newFieldValue;
      }
    }
  }
}

function deepMergeObjectTypeComposerFields(
  existingObjectTypeComposer: ObjectTypeComposer<any, any>,
  newObjectTypeComposer: ObjectTypeComposer<any, any>,
) {
  const existingObjectTypeComposerFields = existingObjectTypeComposer.getFields();
  const newObjectTypeComposerFields = newObjectTypeComposer.getFields();
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
        deepMergeObjectTypeComposerFields(existingFieldUnwrappedTC, newFieldUnwrappedTC);
      } else {
        if (
          newFieldUnwrappedTC &&
          existingFieldUnwrappedTC &&
          !isUnspecificType(newFieldUnwrappedTC) &&
          isUnspecificType(existingFieldUnwrappedTC)
        ) {
          continue;
        }
        existingObjectTypeComposerFields[newFieldKey] = newFieldValue;
      }
    }
  }
}

export function getComposerFromJSONSchema({
  subgraphName,
  schema,
  logger,
  getScalarForFormat,
}: GetComposerFromJSONSchemaOpts): Promise<TypeComposers> {
  const schemaComposer = new SchemaComposer();
  const formatScalarMap = getJSONSchemaStringFormatScalarMap();
  const getDefaultScalarForFormat = (format: string) =>
    formatScalarMapWithoutAjv[format] || formatScalarMap.get(format);

  const rootInputTypeNameComposerMap: Record<string, () => ObjectTypeComposer<any>> = {
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
                subgraph: subgraphName,
                pattern: subSchema.pattern,
              },
            },
            {
              name: 'typescript',
              args: {
                subgraph: subgraphName,
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
        let enumValueName = sanitizeNameForGraphQL(subSchema.const.toString());
        if (enumValueName === 'true' || enumValueName === 'false') {
          enumValueName = enumValueName.toUpperCase();
        }
        const typeComposer = schemaComposer.createEnumTC({
          name: scalarTypeName,
          values: {
            [enumValueName]: {
              directives: [
                {
                  name: 'enum',
                  args: {
                    subgraph: subgraphName,
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
                subgraph: subgraphName,
                type: JSON.stringify(subSchema.const),
              },
            },
            {
              name: 'example',
              args: {
                subgraph: subgraphName,
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
                subgraph: subgraphName,
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
                subgraph: subgraphName,
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
        const formatScalar =
          getScalarForFormat?.(subSchema.format) || getDefaultScalarForFormat(subSchema.format);
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
          if (subSchema.minLength != null || subSchema.maxLength != null) {
            schemaComposer.addDirective(LengthDirective);
            const lengthArgs: {
              subgraph: string;
              min?: number;
              max?: number;
            } = {
              subgraph: subgraphName,
            };
            if (subSchema.minLength != null) {
              lengthArgs.min = subSchema.minLength;
            }
            if (subSchema.maxLength != null) {
              lengthArgs.max = subSchema.maxLength;
            }
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
                  args: lengthArgs,
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
              args: {
                subgraph: subgraphName,
              },
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
                subgraph: subgraphName,
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
                subgraph: subgraphName,
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
          subgraph: string;
          field: string;
          mapping?: [string, string][];
        } = {
          subgraph: subgraphName,
          field: subSchemaOnly.discriminator.propertyName,
        };
        if (subSchemaOnly.discriminator.mapping) {
          const mappingByName: Record<string, string> = {};
          for (const discriminatorValue in subSchemaOnly.discriminatorMapping) {
            const discType = subSchemaOnly.discriminatorMapping[discriminatorValue];
            mappingByName[discriminatorValue] = discType.output.getTypeName();
          }
          discriminatorArgs.mapping = Object.entries(mappingByName);
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
            subgraphName,
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
          subgraphName,
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
                    existingInputFieldUnwrappedTC,
                    newInputFieldUnwrappedTC,
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
                  args: {
                    subgraph: subgraphName,
                  },
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
                  deepMergeObjectTypeComposerFields(existingFieldUnwrappedTC, newFieldUnwrappedTC);
                } else {
                  if (
                    newFieldUnwrappedTC &&
                    existingFieldUnwrappedTC &&
                    !isUnspecificType(newFieldUnwrappedTC) &&
                    isUnspecificType(existingFieldUnwrappedTC)
                  ) {
                    continue;
                  }
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
                subgraph: subgraphName,
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
                  subgraph: subgraphName,
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
                      args: {
                        subgraph: subgraphName,
                      },
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
                    args: {
                      subgraph: subgraphName,
                    },
                  },
                ],
              };
            }
          } else if (
            outputTypeComposer instanceof ObjectTypeComposer ||
            outputTypeComposer instanceof InterfaceTypeComposer
          ) {
            const typeElemFieldMap = outputTypeComposer.getFields();
            for (const fieldName in typeElemFieldMap) {
              // In case of conflict set it to JSON
              // TODO: But instead we can convert that field into a union of all possible types
              const field = typeElemFieldMap[fieldName];
              const existingField: any = fieldMap[fieldName];
              fieldMap[fieldName] = {
                ...field,
                type: () => {
                  if (!field.type) {
                  }
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
                subgraph: subgraphName,
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
                  subgraph: subgraphName,
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
                    subgraph: subgraphName,
                    field: propertyName,
                  },
                });
              }
              if (subSchemaAndTypeComposers.properties[propertyName].flatten) {
                schemaComposer.addDirective(FlattenDirective);
                fieldDirectives.push({
                  name: 'flatten',
                  args: {
                    subgraph: subgraphName,
                  },
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
                extensions: {
                  nullable: subSchemaAndTypeComposers.properties?.[propertyName]?.nullable,
                },
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
                    subgraph: subgraphName,
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
                extensions: {
                  nullable: subSchemaAndTypeComposers.properties?.[propertyName]?.nullable,
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
                    args: {
                      subgraph: subgraphName,
                    },
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
                    args: {
                      subgraph: subgraphName,
                    },
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
            // TODO: Improve this later
            for (const requiredFieldName of subSchemaAndTypeComposers.required || []) {
              const sanitizedFieldName = sanitizeNameForGraphQL(requiredFieldName);
              const fieldObj = (output as ObjectTypeComposer).getField(sanitizedFieldName);
              if (!isNonNullType(fieldObj.type.getType()) && !fieldObj.extensions?.nullable) {
                (output as ObjectTypeComposer).makeFieldNonNull(requiredFieldName);
              }
            }
          }
          let input = subSchemaAndTypeComposers.input;
          if (Object.keys(inputFieldMap).length === 0) {
            input = schemaComposer.getAnyTC(GraphQLJSON);
          } else if (input != null && 'addFields' in input) {
            (input as InputTypeComposer).addFields(inputFieldMap);
            // TODO: Improve this later
            for (const requiredFieldName of subSchemaAndTypeComposers.required || []) {
              const sanitizedFieldName = sanitizeNameForGraphQL(requiredFieldName);
              const field = (input as InputTypeComposer).getField(sanitizedFieldName);
              if (!isNonNullType(field.type.getType()) && !field.extensions?.nullable) {
                (input as InputTypeComposer).makeFieldNonNull(requiredFieldName);
              }
            }
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
}

const specifiedTypeNames = ['String', 'Int', 'Float', 'Boolean', 'ID', 'JSON', 'Void'];

function isUnspecificType(typeComposer: AnyTypeComposer<any>) {
  const tc = typeComposer.getTypeName();
  return !specifiedTypeNames.includes(tc);
}
