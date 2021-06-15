/* eslint-disable no-case-declarations */
import {
  AnyTypeComposer,
  camelCase,
  EnumTypeComposerValueConfigDefinition,
  GraphQLJSON,
  InputTypeComposerFieldConfigMap,
  isSomeInputTypeComposer,
  ObjectTypeComposer,
  ObjectTypeComposerFieldConfig,
  ObjectTypeComposerFieldConfigMap,
  ScalarTypeComposer,
  SchemaComposer,
} from 'graphql-compose';
import { JSONSchema, JSONSchemaObject } from '@json-schema-tools/meta-schema';
import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLScalarType,
  GraphQLString,
  isNonNullType,
  Kind,
} from 'graphql';
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
import { readFileOrUrlWithCache, sanitizeNameForGraphQL, ReadFileOrUrlOptions } from '@graphql-mesh/utils';
import { Logger, KeyValueCache } from '@graphql-mesh/types';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { JsonPointer } from 'json-ptr';
import { dirname, isAbsolute, join } from 'path';

export interface JSONSchemaVisitorContext<T> {
  visitedSubschemaResultMap: WeakMap<JSONSchemaObject, T>;
  path: string;
  keepObjectRef: boolean;
  reverse: boolean;
}

export async function visitJSONSchema<T>(
  schema: JSONSchema,
  visitorFn: (subSchema: JSONSchema, context: JSONSchemaVisitorContext<T>) => Promise<T> | T,
  { visitedSubschemaResultMap, path, keepObjectRef, reverse }: JSONSchemaVisitorContext<T> = {
    visitedSubschemaResultMap: new WeakMap(),
    path: '',
    keepObjectRef: false,
    reverse: false,
  }
) {
  const context = {
    visitedSubschemaResultMap,
    path,
    keepObjectRef,
    reverse,
  };
  if (typeof schema === 'object') {
    if (!visitedSubschemaResultMap.has(schema)) {
      const result: any = keepObjectRef ? schema : {};
      const visitedSchema: any = keepObjectRef ? schema : { ...schema };
      visitedSubschemaResultMap.set(schema, result);
      const visitAndSet = async () => {
        const visitorResult = await visitorFn(visitedSchema, context);
        if (!keepObjectRef) {
          Object.assign(result, visitorResult);
          visitedSubschemaResultMap.set(schema, result);
        } else {
          visitedSubschemaResultMap.set(schema, visitorResult);
        }
      };
      if (reverse) {
        await visitAndSet();
      }
      if (schema.additionalItems) {
        visitedSchema.additionalItems = await visitJSONSchema(schema.additionalItems, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/additionalItems',
          keepObjectRef,
          reverse,
        });
      }
      if (schema.additionalProperties) {
        visitedSchema.additionalProperties = await visitJSONSchema(schema.additionalProperties, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/additionalProperties',
          keepObjectRef,
          reverse,
        });
      }
      if (schema.allOf) {
        visitedSchema.allOf = keepObjectRef ? visitedSchema.allOf : [];
        for (const subSchemaIndex in schema.allOf) {
          visitedSchema.allOf[subSchemaIndex] = await visitJSONSchema(schema.allOf[subSchemaIndex], visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/allOf/' + subSchemaIndex,
            keepObjectRef,
            reverse,
          });
        }
      }
      if (schema.anyOf) {
        visitedSchema.anyOf = keepObjectRef ? visitedSchema.anyOf : [];
        for (const subSchemaIndex in schema.anyOf) {
          visitedSchema.anyOf[subSchemaIndex] = await visitJSONSchema(schema.anyOf[subSchemaIndex], visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/anyOf/' + subSchemaIndex,
            keepObjectRef,
            reverse,
          });
        }
      }
      if (schema.contains) {
        visitedSchema.contains = await visitJSONSchema(schema.contains, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/contains',
          keepObjectRef,
          reverse,
        });
      }
      if (schema.definitions) {
        visitedSchema.definitions = keepObjectRef ? visitedSchema.definitions : {};
        for (const definitionName in schema.definitions) {
          visitedSchema.definitions[definitionName] = await visitJSONSchema(
            schema.definitions[definitionName],
            visitorFn,
            {
              visitedSubschemaResultMap,
              path: path + '/definitions/' + definitionName,
              keepObjectRef,
              reverse,
            }
          );
        }
      }
      if (schema.else) {
        visitedSchema.else = await visitJSONSchema(schema.else, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/else',
          keepObjectRef,
          reverse,
        });
      }
      if (schema.if) {
        visitedSchema.if = await visitJSONSchema(schema.if, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/if',
          keepObjectRef,
          reverse,
        });
      }
      if (schema.items) {
        if (Array.isArray(schema.items)) {
          visitedSchema.items = keepObjectRef ? visitedSchema.items : [];
          for (const subSchemaIndex in schema.items) {
            visitedSchema.items[subSchemaIndex] = await visitJSONSchema(schema.items[subSchemaIndex], visitorFn, {
              visitedSubschemaResultMap,
              path: path + '/items/' + subSchemaIndex,
              keepObjectRef,
              reverse,
            });
          }
        } else {
          visitedSchema.items = await visitJSONSchema(schema.items, visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/items',
            keepObjectRef,
            reverse,
          });
        }
      }
      if (schema.not) {
        visitedSchema.not = await visitJSONSchema(schema.not, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/not',
          keepObjectRef,
          reverse,
        });
      }
      if (schema.oneOf) {
        visitedSchema.oneOf = keepObjectRef ? visitedSchema.oneOf : [];
        for (const subSchemaIndex in schema.oneOf) {
          visitedSchema.oneOf[subSchemaIndex] = await visitJSONSchema(schema.oneOf[subSchemaIndex], visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/oneOf/' + subSchemaIndex,
            keepObjectRef,
            reverse,
          });
        }
      }
      if (schema.patternProperties) {
        visitedSchema.patternProperties = keepObjectRef ? visitedSchema.patternProperties : {};
        for (const pattern in schema.patternProperties) {
          visitedSchema.patternProperties[pattern] = await visitJSONSchema(
            schema.patternProperties[pattern],
            visitorFn,
            {
              visitedSubschemaResultMap,
              path: path + '/patternProperties/' + pattern,
              keepObjectRef,
              reverse,
            }
          );
        }
      }
      if (schema.properties) {
        visitedSchema.properties = keepObjectRef ? visitedSchema.properties : {};
        for (const property in schema.properties) {
          visitedSchema.properties[property] = await visitJSONSchema(schema.properties[property], visitorFn, {
            visitedSubschemaResultMap,
            path: path + '/properties/' + property,
            keepObjectRef,
            reverse,
          });
        }
      }
      if (schema.then) {
        visitedSchema.then = await visitJSONSchema(schema.then, visitorFn, {
          visitedSubschemaResultMap,
          path: path + '/then',
          keepObjectRef,
          reverse,
        });
      }

      if (!reverse) {
        await visitAndSet();
      }
    }
    return visitedSubschemaResultMap.get(schema);
  }
  return visitorFn(schema, context);
}

export async function referenceJSONSchemaObject(schema: JSONSchemaObject) {
  const definitions: Record<string, JSONSchemaObject> = {};
  const finalSchema = await visitJSONSchema<any>(schema, subSchema => {
    if (typeof subSchema === 'object') {
      // Remove $id refs
      delete subSchema.$id;
      if (subSchema.$ref) {
        throw new Error('Input schema should be fully resolved! It cannot have $refs in it!');
      } else if (subSchema.title) {
        if (subSchema.title in definitions) {
          let cnt = 2;
          while (`${subSchema.title}${cnt}` in definitions) {
            cnt++;
          }
          const definitionProp = `${subSchema.title}${cnt}`;
          definitions[definitionProp] = subSchema;
          const $ref = `#/definitions/${definitionProp}`;
          return {
            $ref,
          };
        } else {
          definitions[subSchema.title] = subSchema;
          const $ref = `#/definitions/${subSchema.title}`;
          return {
            $ref,
          };
        }
      }
    }
    return subSchema;
  });
  finalSchema.definitions = definitions;
  return finalSchema;
}

const getAbsolute$Ref = (given$ref: string, baseFilePath: string) => {
  const [givenExternalFileRelativePath, givenRefPath] = given$ref.split('#');
  if (givenExternalFileRelativePath) {
    const cwd = dirname(baseFilePath);
    const givenExternalFilePath = isAbsolute(givenExternalFileRelativePath)
      ? givenExternalFileRelativePath
      : join(cwd, givenExternalFileRelativePath);
    if (givenRefPath) {
      return `${givenExternalFilePath}#${givenRefPath}`;
    }
    return givenExternalFilePath;
  }
  return `${baseFilePath}#${givenRefPath}`;
};

const dereferencedJSONSchemaWeakMap = new WeakMap<JSONSchemaObject, any>();
export async function dereferenceJSONSchema(
  schema: string | JSONSchema,
  cache: KeyValueCache<any>,
  config: ReadFileOrUrlOptions,
  externalFileCache = new Map<string, JSONSchemaObject>(),
  refMap = new Map<string, JSONSchemaObject>()
) {
  if (typeof schema === 'string') {
    schema = {
      $ref: schema,
    };
  }
  return visitJSONSchema(
    typeof schema === 'object' ? { ...schema } : schema,
    async function visitorFn(subSchema): Promise<any> {
      if (typeof subSchema === 'object' && subSchema.$ref) {
        if (refMap.has(subSchema.$ref)) {
          return refMap.get(subSchema.$ref);
        }
        const [externalRelativeFilePath, refPath] = subSchema.$ref.split('#');
        if (externalRelativeFilePath) {
          const externalFilePath = isAbsolute(externalRelativeFilePath)
            ? externalRelativeFilePath
            : join(config.cwd, externalRelativeFilePath);
          const newCwd = dirname(externalFilePath);
          let externalFile = externalFileCache.get(externalFilePath);
          const newConfig = {
            ...config,
            cwd: newCwd,
          };
          if (!externalFile) {
            externalFile = await readFileOrUrlWithCache(externalFilePath, cache, newConfig);
            externalFile = (await healJSONSchema(externalFile)) as JSONSchemaObject;
            externalFileCache.set(externalFilePath, externalFile);
          }
          const fakeRefObject = {
            $ref: `#${refPath}`,
            ...externalFile,
          };
          const result = await dereferenceJSONSchema(
            refPath ? fakeRefObject : externalFile,
            cache,
            newConfig,
            externalFileCache,
            new Proxy(refMap, {
              get: (originalRefMap, key) => {
                switch (key) {
                  case 'has':
                    return (given$ref: string) => {
                      const original$Ref = getAbsolute$Ref(given$ref, externalFilePath);
                      return originalRefMap.has(original$Ref);
                    };
                  case 'get':
                    return (given$ref: string) => {
                      const original$Ref = getAbsolute$Ref(given$ref, externalFilePath);
                      return originalRefMap.get(original$Ref);
                    };
                  case 'set':
                    return (given$ref: string, val: any) => {
                      const original$Ref = getAbsolute$Ref(given$ref, externalFilePath);
                      return originalRefMap.set(original$Ref, val);
                    };
                }
                throw new Error('Not implemented');
              },
            })
          );
          return result;
        } else {
          const result = resolvePath(refPath, schema);
          refMap.set(subSchema.$ref, result);
          return result;
        }
      }
      return subSchema;
    },
    {
      path: '/',
      visitedSubschemaResultMap: dereferencedJSONSchemaWeakMap,
      keepObjectRef: true,
      reverse: false,
    }
  );
}

const reservedTypeNames = ['Query', 'Mutation', 'Subscription'];

export async function healJSONSchema(schema: JSONSchema) {
  return visitJSONSchema<JSONSchema>(
    schema,
    (subSchema, { path }) => {
      if (typeof subSchema === 'object') {
        if (!subSchema.title && !subSchema.$ref) {
          // Try to get definition name
          const maybeDefinitionBasedPath = path.includes('/definitions/') ? path.split('/definitions/')[1] : path;
          let pathBasedName = maybeDefinitionBasedPath.split('/properties').join('').split('/').join('_');
          switch (subSchema.type) {
            case 'string':
              if (subSchema.pattern || subSchema.maxLength || subSchema.minLength || subSchema.enum) {
                subSchema.title = pathBasedName;
              } else if (subSchema.format) {
                subSchema.title = subSchema.format;
              }
              break;
            case 'integer':
              if (subSchema.format) {
                subSchema.title = subSchema.format;
              }
              break;
          }
          if (reservedTypeNames.includes(pathBasedName)) {
            pathBasedName += '_';
          }
          subSchema.title = subSchema.title || pathBasedName;
        }
        if (!subSchema.type) {
          if (subSchema.properties) {
            subSchema.type = 'object';
          }
          if (subSchema.items) {
            subSchema.type = 'array';
          }
        }
      }
      return subSchema;
    },
    {
      visitedSubschemaResultMap: new WeakMap(),
      path: '',
      keepObjectRef: true,
      reverse: false,
    }
  );
}

export const resolvePath = (path: string, root: any): any => {
  return JsonPointer.get(root, path);
};

interface TypeComposers {
  input?: AnyTypeComposer<any>;
  output: AnyTypeComposer<any> | SchemaComposer;
}

const JSONSchemaStringFormats = [
  'hostname',
  'regex',
  'json-pointer',
  'relative-json-pointer',
  'uri-reference',
  'uri-template',
];

const generateInterfaceFromSharedFields = false;

const JSONSchemaStringFormatScalarMapFactory = (ajv: Ajv) =>
  new Map<string, GraphQLScalarType>(
    JSONSchemaStringFormats.map(format => {
      const schema = {
        type: 'string',
        format,
      };
      const validate = ajv.compile(schema);
      const coerceString = (value: string) => {
        if (validate(value)) {
          return value;
        }
        throw new Error(`Expected ${format} but got: ${value}`);
      };
      const scalar = new GraphQLScalarType({
        name: camelCase(format),
        description: `Represents ${format} values`,
        serialize: coerceString,
        parseValue: coerceString,
        parseLiteral: ast => {
          if (ast.kind === Kind.STRING) {
            return coerceString(ast.value);
          }
          throw new Error(`Expected string in ${format} format but got: ${(ast as any).value}`);
        },
      });
      return [format, scalar];
    })
  );

export function getComposerFromJSONSchema(schema: JSONSchema, logger: Logger): Promise<TypeComposers> {
  const schemaComposer = new SchemaComposer();
  const ajv = new Ajv({
    strict: false,
  });
  addFormats(ajv);
  const formatScalarMap = JSONSchemaStringFormatScalarMapFactory(ajv);
  return visitJSONSchema(schema, function mutateFn(subSchema, { path }): any {
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
      const getGenericJSONScalar = (isInput: boolean, description?: string) => {
        const coerceValue = (value: any) => {
          if (!validate(value)) {
            throw new Error(`${JSON.stringify(value)} is not valid!`);
          }
          return value;
        };
        return schemaComposer.createScalarTC({
          name: getValidTypeName(isInput),
          description: subSchema.description || description,
          serialize: coerceValue,
          parseValue: coerceValue,
          parseLiteral: (...args) => {
            const value = GraphQLJSON.parseLiteral(...args);
            return coerceValue(value);
          },
        });
      };

      const getUnionTypeComposers = (typeComposersList: any[]) => {
        const unionInputFields: Record<string, any> = {};
        const outputTypeComposers: ObjectTypeComposer<any>[] = [];
        let ableToUseGraphQLUnionType = true;
        typeComposersList.forEach(typeComposers => {
          const { input, output } = typeComposers;
          if (isSomeInputTypeComposer(output)) {
            ableToUseGraphQLUnionType = false;
          } else {
            outputTypeComposers.push(output);
          }
          unionInputFields[input.getTypeName()] = {
            type: input,
          };
        });
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

        let output: AnyTypeComposer<any>;
        if (ableToUseGraphQLUnionType) {
          const resolveType = (data: any) =>
            data.__typename ||
            data.resourceType ||
            outputTypeComposers
              .find(typeComposer => (typeComposer.getExtension('validate') as ValidateFunction)(data))
              .getTypeName();
          let sharedFields: Record<string, ObjectTypeComposerFieldConfig<any, any, any>>;
          if (generateInterfaceFromSharedFields) {
            for (const typeComposer of outputTypeComposers) {
              const fieldMap = typeComposer.getFields();
              if (!sharedFields) {
                sharedFields = { ...fieldMap };
              } else {
                for (const potentialSharedFieldName in sharedFields) {
                  if (
                    !(
                      potentialSharedFieldName in fieldMap &&
                      fieldMap[potentialSharedFieldName].type.getTypeName() ===
                        sharedFields[potentialSharedFieldName].type.getTypeName()
                    )
                  ) {
                    sharedFields[potentialSharedFieldName] = undefined;
                    delete sharedFields[potentialSharedFieldName];
                  }
                }
              }
            }
          }

          if (sharedFields && Object.keys(sharedFields).length > 0) {
            output = schemaComposer.createInterfaceTC({
              name: getValidTypeName(false),
              description: subSchema.description,
              fields: sharedFields,
              resolveType,
            });
            for (const typeComposer of outputTypeComposers) {
              typeComposer.addInterface(output);
              // GraphQL removes implementations
              schemaComposer.addSchemaMustHaveType(output);
            }
          } else {
            // If no shared fields found
            output = schemaComposer.createUnionTC({
              name: getValidTypeName(false),
              description: subSchema.description,
              types: outputTypeComposers,
              resolveType,
            });
          }
        } else {
          output = getGenericJSONScalar(false);
        }
        return {
          input,
          output,
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
            ableToUseGraphQLObjectType = false;
          } else {
            const typeElemFieldMap = outputTypeComposer.getFields();
            for (const fieldName in typeElemFieldMap) {
              const field = typeElemFieldMap[fieldName];
              fieldMap[fieldName] = isNonNullType(field.type.getType())
                ? {
                    ...field,
                    type: () => field.type.ofType,
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
        const validTypes = subSchema.type.filter((typeName: string) => typeName !== 'null');
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
              const typeComposer = schemaComposer.getAnyTC(formatScalarMap.get(subSchema.format));
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
          if (
            typeof subSchema.items === 'object' &&
            !Array.isArray(subSchema.items) &&
            Object.keys(subSchema.items).length > 0
          ) {
            const typeComposers = subSchema.items;
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
            /* TODO
            if (subSchema.additionalItems) {
              existingItems.push(subSchema.additionalItems);
            }
            */
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
            subSchema.type = 'object';
            for (const propertyName in subSchema.properties) {
              const typeComposers = subSchema.properties[propertyName];
              fieldMap[propertyName] = {
                type: () =>
                  subSchema.required?.includes(propertyName)
                    ? typeComposers.output.getTypeNonNull()
                    : typeComposers.output,
              };
              inputFieldMap[propertyName] = {
                type: () =>
                  subSchema.required?.includes(propertyName)
                    ? typeComposers.input?.getTypeNonNull()
                    : typeComposers.input,
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
            const typeComposer = schemaComposer.Query;
            for (const fieldName in inputFieldMap) {
              typeComposer.addFieldArgs(fieldName, {
                input: {
                  type: () => inputFieldMap[fieldName].type().getTypeNonNull(),
                },
              });
            }
            return {
              output: typeComposer,
            };
          }

          if (subSchema.title === 'MutationInput') {
            const typeComposer = schemaComposer.Mutation;
            for (const fieldName in inputFieldMap) {
              typeComposer.addFieldArgs(fieldName, {
                input: {
                  type: () => inputFieldMap[fieldName].type().getTypeNonNull(),
                },
              });
            }
            return {
              output: typeComposer,
            };
          }

          if (subSchema.title === 'SubscriptionInput') {
            const typeComposer = schemaComposer.Subscription;
            for (const fieldName in inputFieldMap) {
              typeComposer.addFieldArgs(fieldName, {
                input: {
                  type: () => inputFieldMap[fieldName].type().getTypeNonNull(),
                },
              });
            }
            return {
              output: typeComposer,
            };
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
      logger.warn(
        `GraphQL Type cannot be created for this JSON Schema definition: ${JSON.stringify(
          { subSchema, path },
          null,
          2
        )}`
      );
      const typeComposer = schemaComposer.getAnyTC(GraphQLJSON);
      return {
        input: typeComposer,
        output: typeComposer,
      };
    };
    const result = getTypeComposer();
    return result;
  }) as any;
}
