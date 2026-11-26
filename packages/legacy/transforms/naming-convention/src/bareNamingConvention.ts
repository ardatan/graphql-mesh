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
import {
  defaultFieldResolver,
  getNamedType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
} from 'graphql';
import type { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import { MapperKind, mapSchema, renameType } from '@graphql-tools/utils';
import {
  hasRewritableEnumDefaultForType,
  IGNORED_ROOT_FIELD_NAMES,
  IGNORED_TYPE_NAMES,
  NAMING_CONVENTIONS,
  withRenamedEnumDefaultsForType,
} from './shared.js';

/** Helper input shape — GQL17 `default` is not on GraphQLArgumentConfig under v16 types. */
type ArgDefaultFields = Parameters<typeof hasRewritableEnumDefaultForType>[0];

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
    // mapSchema serializes defaults before enum rename, then may pass the
    // external name through when the renamed enum rejects the wire value
    // (newbie→'wire' becomes 'newbie', which is also other's internal value).
    // Always rewrite from the original default + original input type together.
    const originalSchema = schema;
    const typeNamesFn = this.config.typeNames && NAMING_CONVENTIONS[this.config.typeNames];
    const fieldNamesFn = this.config.fieldNames && NAMING_CONVENTIONS[this.config.fieldNames];
    const renameFieldForLookup = (name: string) =>
      IGNORED_ROOT_FIELD_NAMES.includes(name) ? name : fieldNamesFn?.(name) || name;

    return mapSchema(schema, {
      ...(this.config.typeNames && {
        [MapperKind.TYPE]: type => {
          const oldName = type.name;
          const namingConventionFn = typeNamesFn!;
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
          const namingConventionFn = typeNamesFn!;
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
      ...((this.config.enumValues || this.config.fieldNames) && {
        [MapperKind.ARGUMENT]: (config, fieldName, typeName) => {
          // typeName is still the pre-rewire map key (original). fieldName may
          // already be renamed by COMPOSITE_FIELD; resolve via original schema.
          const origParent = originalSchema.getType(typeName);
          if (!origParent || (!isObjectType(origParent) && !isInterfaceType(origParent))) {
            return config;
          }
          const origFieldEntry = Object.entries(origParent.getFields()).find(
            ([fname]) => renameFieldForLookup(fname) === fieldName,
          );
          const origField = origFieldEntry?.[1];
          // COMPOSITE_FIELD renames arg map keys but leaves astNode.name original.
          const origArgName = config.astNode?.name?.value;
          const origArg =
            (origArgName && origField?.args.find(a => a.name === origArgName)) ||
            origField?.args.find(a => a.type === config.type);
          const sourceConfig: ArgDefaultFields = origArg
            ? {
                defaultValue: origArg.defaultValue,
                default: (origArg as { default?: ArgDefaultFields['default'] }).default,
                astNode: origArg.astNode ?? undefined,
              }
            : {
                defaultValue: config.defaultValue,
                default: (config as ArgDefaultFields).default,
                astNode: config.astNode,
              };
          const sourceType = origArg?.type ?? config.type;
          const named = getNamedType(sourceType);
          // Enum args + input-object args with nested enum / key-only defaults
          // (`filter: Filter = { status: newbie }` / `{ retry_count: 3 }`).
          if (!isEnumType(named) && !isInputObjectType(named)) {
            return config;
          }
          const fieldNamingConventionFn = fieldNamesFn || undefined;
          if (!hasRewritableEnumDefaultForType(sourceConfig, sourceType, fieldNamingConventionFn)) {
            return config;
          }
          const applyNamingConvention = this.config.enumValues
            ? NAMING_CONVENTIONS[this.config.enumValues]
            : (s: string) => s;
          // Cast: helper `default` is a loose snapshot; GQL16 GraphQLArgumentConfig has no `default`.
          return {
            ...config,
            ...withRenamedEnumDefaultsForType(
              sourceConfig,
              sourceType,
              applyNamingConvention,
              fieldNamingConventionFn,
            ),
          } as typeof config;
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
                // `[Filter]` / `Filter!` — reverse-map via the named input object.
                const namedArgType = getNamedType(argConfig.type);
                const argIsInputObjectType = isInputObjectType(namedArgType);

                if (argIsInputObjectType) {
                  argsMap[useArgName] = {
                    originalName: argName,
                    fields: generateArgsMapForInput(
                      namedArgType as GraphQLInputObjectType,
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
      ...((this.config.fieldNames || this.config.enumValues) && {
        [MapperKind.INPUT_OBJECT_FIELD]: (inputFieldConfig, fieldName, typeName) => {
          if (IGNORED_TYPE_NAMES.includes(typeName)) {
            return undefined;
          }
          const namingConventionFn = fieldNamesFn || undefined;
          const newName = namingConventionFn ? namingConventionFn(fieldName) : fieldName;
          let nextConfig = inputFieldConfig;
          if (this.config.enumValues || this.config.fieldNames) {
            const origInput = originalSchema.getType(typeName);
            const origField =
              origInput && isInputObjectType(origInput)
                ? origInput.getFields()[fieldName]
                : undefined;
            const sourceConfig: ArgDefaultFields = origField
              ? {
                  defaultValue: origField.defaultValue,
                  default: (origField as { default?: ArgDefaultFields['default'] }).default,
                  astNode: origField.astNode ?? undefined,
                }
              : {
                  defaultValue: inputFieldConfig.defaultValue,
                  default: (inputFieldConfig as ArgDefaultFields).default,
                  astNode: inputFieldConfig.astNode,
                };
            const sourceType = origField?.type ?? inputFieldConfig.type;
            const namedFieldType = getNamedType(sourceType);
            if (
              (isEnumType(namedFieldType) || isInputObjectType(namedFieldType)) &&
              hasRewritableEnumDefaultForType(sourceConfig, sourceType, namingConventionFn)
            ) {
              // Cast: GQL16 GraphQLInputFieldConfig has no `default` field.
              nextConfig = {
                ...inputFieldConfig,
                ...withRenamedEnumDefaultsForType(
                  sourceConfig,
                  sourceType,
                  this.config.enumValues
                    ? NAMING_CONVENTIONS[this.config.enumValues]
                    : (s: string) => s,
                  namingConventionFn,
                ),
              } as typeof inputFieldConfig;
            }
          }
          if (newName === fieldName) {
            return nextConfig === inputFieldConfig ? undefined : nextConfig;
          }
          return [newName, nextConfig];
        },
      }),
    });
  }
}

function generateArgsMapForInput(
  input: GraphQLInputObjectType,
  fieldNamingConventionFn?: null | ((input: string) => string),
  memo: Map<string, ArgsMap> = new Map(),
): ArgsMap {
  const cached = memo.get(input.name);
  if (cached) {
    return cached;
  }
  // Memoize before visiting fields so recursive inputs (`Filter { and: [Filter!] }`)
  // reuse this map instead of overflowing the stack.
  const argsMap: ArgsMap = {};
  memo.set(input.name, argsMap);

  const inputConfig = input.toConfig();
  const inputFields = inputConfig.fields;
  const skipFieldRename = IGNORED_TYPE_NAMES.includes(input.name);

  Object.keys(inputFields).forEach(argName => {
    if (typeof argName === 'number') return;

    const newArgName =
      !skipFieldRename && fieldNamingConventionFn ? fieldNamingConventionFn(argName) : argName;
    const argConfig = inputFields[argName];

    // Unwind any list / nulls etc
    const type = getNamedType(argConfig.type);

    const argIsInputObjectType = isInputObjectType(type);

    if (argIsInputObjectType) {
      argsMap[newArgName] = {
        originalName: argName,
        fields: generateArgsMapForInput(
          type as GraphQLInputObjectType,
          fieldNamingConventionFn,
          memo,
        ),
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
