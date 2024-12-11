import type {
  GraphQLAbstractType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLUnionType,
} from 'graphql';
import { defaultFieldResolver, getNamedType, isEnumType, isInputObjectType, Kind } from 'graphql';
import type { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { MapperKind, mapSchema, renameType } from '@graphql-tools/utils';
import { IGNORED_ROOT_FIELD_NAMES, IGNORED_TYPE_NAMES, NAMING_CONVENTIONS } from './shared.js';

export declare type GraphQLTypePointer =
  | GraphQLList<GraphQLOutputType>
  | GraphQLNonNull<
      | GraphQLScalarType
      | GraphQLObjectType
      | GraphQLInterfaceType
      | GraphQLUnionType
      | GraphQLEnumType
      | GraphQLList<GraphQLOutputType>
    >;

interface ArgsMap {
  [newArgName: string]:
    | string
    | {
        originalName: string;
        fields: ArgsMap;
      };
}

const isObject = (input: any) =>
  typeof input === 'object' && input !== null && !Array.isArray(input) && true;

const getUnderlyingType = (type: GraphQLOutputType): GraphQLOutputType =>
  (type as GraphQLTypePointer).ofType
    ? getUnderlyingType((type as GraphQLTypePointer).ofType)
    : type;

// Resolver composer mapping renamed field and arguments
const defaultResolverComposer =
  (
    resolveFn = defaultFieldResolver,
    originalFieldName: string,
    argsMap: ArgsMap,
    resultMap: { [key: string]: string },
  ) =>
  (root: any, args: any, context: any, info: any) => {
    const originalResult = resolveFn(
      root,
      // map renamed arguments to their original value
      argsMap ? argsFromArgMap(argsMap, args) : args,
      context,
      // map renamed field name to its original value
      originalFieldName ? { ...info, fieldName: originalFieldName } : info,
    );

    // map result values from original value to new renamed value
    return resultMap
      ? Array.isArray(originalResult)
        ? originalResult.map(result => resultMap[result as string] || result)
        : resultMap[originalResult as string] || originalResult
      : originalResult;
  };

export default class NamingConventionTransform implements MeshTransform {
  noWrap = true;
  config: Omit<YamlConfig.NamingConventionTransformConfig, 'mode'>;

  constructor(options: MeshTransformOptions<YamlConfig.NamingConventionTransformConfig>) {
    this.config = { ...options.config };
  }

  transformSchema(schema: GraphQLSchema) {
    return mapSchema(schema, {
      ...(this.config.typeNames && {
        [MapperKind.TYPE]: type => {
          const oldName = type.name;
          const namingConventionFn = NAMING_CONVENTIONS[this.config.typeNames];
          const newName = IGNORED_TYPE_NAMES.includes(oldName)
            ? oldName
            : namingConventionFn(oldName);

          if (newName !== undefined && newName !== oldName) {
            return renameType(type, newName);
          }

          return undefined;
        },
        [MapperKind.ABSTRACT_TYPE]: type => {
          const currentName = type.name;
          const existingResolver = type.resolveType;
          const namingConventionFn = NAMING_CONVENTIONS[this.config.typeNames];
          const newName = IGNORED_TYPE_NAMES.includes(currentName)
            ? currentName
            : namingConventionFn(currentName);

          type.resolveType = async (data, context, info, abstractType) => {
            const originalResolvedTypename = await existingResolver(
              data,
              context,
              info,
              abstractType,
            );
            return IGNORED_TYPE_NAMES.includes(originalResolvedTypename)
              ? originalResolvedTypename
              : namingConventionFn(originalResolvedTypename);
          };

          if (newName !== undefined && newName !== currentName) {
            return renameType(type, newName) as GraphQLAbstractType;
          }

          return undefined;
        },
      }),
      ...(this.config.enumValues && {
        [MapperKind.ARGUMENT]: config => {
          const shouldRenameEnumDefaultValue =
            this.config.enumValues &&
            config.astNode?.defaultValue?.kind === Kind.ENUM &&
            typeof config.defaultValue === 'string' &&
            config.defaultValue;
          if (shouldRenameEnumDefaultValue) {
            const applyNamingConvention = NAMING_CONVENTIONS[this.config.enumValues];
            config.defaultValue = applyNamingConvention(config.defaultValue as string);
          }

          return config;
        },
      }),
      ...(this.config.enumValues && {
        [MapperKind.ENUM_VALUE]: (valueConfig, _typeName, _schema, externalValue) => {
          const namingConventionFn = NAMING_CONVENTIONS[this.config.enumValues];
          const newEnumValue = namingConventionFn(externalValue);

          if (newEnumValue === externalValue) {
            return undefined;
          }

          return [
            newEnumValue,
            {
              ...valueConfig,
              value: newEnumValue,
              astNode: {
                ...valueConfig.astNode,
                name: {
                  ...valueConfig.astNode.name,
                  value: newEnumValue,
                },
              },
            },
          ];
        },
      }),
      ...((this.config.enumValues || this.config.fieldNames || this.config.fieldArgumentNames) && {
        [MapperKind.COMPOSITE_FIELD]: (fieldConfig, fieldName) => {
          const enumNamingConventionFn = NAMING_CONVENTIONS[this.config.enumValues];
          const fieldNamingConventionFn =
            this.config.fieldNames && NAMING_CONVENTIONS[this.config.fieldNames];
          const argNamingConventionFn =
            this.config.fieldArgumentNames && NAMING_CONVENTIONS[this.config.fieldArgumentNames];
          const argsMap: ArgsMap = fieldConfig.args && {};
          const newFieldName =
            this.config.fieldNames &&
            !IGNORED_ROOT_FIELD_NAMES.includes(fieldName) &&
            fieldNamingConventionFn(fieldName);
          const fieldActualType = getUnderlyingType(fieldConfig.type);
          const resultMap =
            this.config.enumValues &&
            isEnumType(fieldActualType) &&
            Object.keys(fieldActualType.toConfig().values).reduce((map, value) => {
              if (Number.isFinite(value)) {
                return map;
              }

              const newValue = enumNamingConventionFn(value as string);
              return newValue === value
                ? map
                : {
                    ...map,
                    [value]: newValue,
                  };
            }, {});

          if (fieldConfig.args) {
            fieldConfig.args = Object.entries(fieldConfig.args).reduce(
              (args, [argName, argConfig]) => {
                const newArgName = this.config.fieldArgumentNames && argNamingConventionFn(argName);
                const useArgName = newArgName || argName;
                const argIsInputObjectType = isInputObjectType(argConfig.type);

                if (argIsInputObjectType) {
                  argsMap[useArgName] = {
                    originalName: argName,
                    fields: generateArgsMapForInput(
                      argConfig.type as GraphQLInputObjectType,
                      fieldNamingConventionFn,
                    ),
                  };
                } else if (argName !== useArgName) {
                  argsMap[useArgName] = argName;
                }

                return {
                  ...args,
                  [useArgName]: argConfig,
                };
              },
              {},
            );
          }

          // Wrap resolve fn to handle mapping renamed field and argument names as well as results (for enums)
          fieldConfig.resolve = defaultResolverComposer(
            fieldConfig.resolve,
            fieldName,
            Object.keys(argsMap).length ? argsMap : null,
            resultMap,
          );

          return [newFieldName || fieldName, fieldConfig];
        },
      }),
      ...(this.config.fieldNames && {
        [MapperKind.INPUT_OBJECT_FIELD]: (inputFieldConfig, fieldName) => {
          const namingConventionFn =
            this.config.fieldNames && NAMING_CONVENTIONS[this.config.fieldNames];
          const newName = namingConventionFn(fieldName);

          if (newName === fieldName) {
            return undefined;
          }

          return [newName, inputFieldConfig];
        },
      }),
    });
  }
}

function generateArgsMapForInput(
  input: GraphQLInputObjectType,
  fieldNamingConventionFn?: null | ((input: string) => string),
): ArgsMap {
  const inputConfig = input.toConfig();
  const inputFields = inputConfig.fields;
  const argsMap: ArgsMap = {};

  Object.keys(inputFields).forEach(argName => {
    if (typeof argName === 'number') return;

    const newArgName = fieldNamingConventionFn ? fieldNamingConventionFn(argName) : argName;
    const argConfig = inputFields[argName];

    // Unwind any list / nulls etc
    const type = getNamedType(argConfig.type);

    const argIsInputObjectType = isInputObjectType(type);

    if (argIsInputObjectType) {
      argsMap[newArgName] = {
        originalName: argName,
        fields: generateArgsMapForInput(type as GraphQLInputObjectType, fieldNamingConventionFn),
      };
    } else {
      argsMap[newArgName] = argName;
    }
  });

  return argsMap;
}

// Map back from new arg name to the original one
function argsFromArgMap(argMap: ArgsMap, args: any) {
  const originalArgs: Record<string, any> = {};
  Object.keys(args).forEach(newArgName => {
    if (typeof newArgName !== 'string') return;

    const argMapVal = argMap[newArgName] ?? newArgName;
    const originalArgName = typeof argMapVal === 'string' ? argMapVal : argMapVal.originalName;
    const val = args[newArgName];
    if (Array.isArray(val) && typeof argMapVal !== 'string') {
      originalArgs[originalArgName] = val.map(v =>
        isObject(v) ? argsFromArgMap(argMapVal.fields, v) : v,
      );
    } else if (isObject(val) && typeof argMapVal !== 'string') {
      originalArgs[originalArgName] = argsFromArgMap(argMapVal.fields, val);
    } else {
      originalArgs[originalArgName] = val;
    }
  });

  return originalArgs;
}
