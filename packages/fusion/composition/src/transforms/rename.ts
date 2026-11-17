import {
  getNamedType,
  GraphQLObjectType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isSpecifiedScalarType,
  type GraphQLFieldConfig,
  type GraphQLFieldConfigArgumentMap,
  type GraphQLInputFieldConfig,
  type GraphQLNamedType,
  type GraphQLSchema,
} from 'graphql';
import { resolvers as scalarsResolversMap } from 'graphql-scalars';
import {
  getDirectiveExtensions,
  getRootTypes,
  MapperKind,
  mapSchema,
  type SchemaMapper,
} from '@graphql-tools/utils';
import type { SubgraphConfig, SubgraphTransform } from '../compose.js';
import {
  rewriteConnectArgReferences,
  rewriteProtobufMappingBinds,
  withOriginalKeyFallback,
} from './utils.js';

export const ignoreList = [
  'Int',
  'Float',
  'String',
  'Boolean',
  'ID',
  'date',
  'hostname',
  'regex',
  'json-pointer',
  'relative-json-pointer',
  'uri-reference',
  'uri-template',
  'ObjMap',
  'HttpMethod',
  // Federation Connectors directive inputs (method names / baseURL are spec-fixed)
  'ConnectHTTP',
  'SourceHTTP',
  'HTTPHeaderMapping',
  'ConnectorErrors',
  // Connect `@link` scalars — must stay unprefixed so finalize can drop exact names
  'JSONSelection',
  'URLPathTemplate',
  ...Object.keys(scalarsResolversMap),
];

export type TypeRenamer = (opts: {
  typeName: string;
  type: GraphQLNamedType;
  subgraphConfig: SubgraphConfig;
}) => string;
export type FieldRenamer = (opts: {
  typeName: string;
  fieldName: string;
  type: GraphQLNamedType;
  field: GraphQLFieldConfig<any, any> | GraphQLInputFieldConfig;
  subgraphConfig: SubgraphConfig;
}) => string;
export type ArgumentRenamer = (opts: {
  typeName: string;
  fieldName: string;
  argName: string;
  subgraphConfig: SubgraphConfig;
}) => string;

export interface RenameTransformConfig {
  renames?: RenameTransformObject[];
  typeRenamer?: TypeRenamer;
  fieldRenamer?: FieldRenamer;
  argRenamer?: ArgumentRenamer;
}

export interface RenameTransformObject {
  from: RenameConfig;
  to: RenameConfig;
  /**
   * Use regular expression to match the type name
   * @default false
   */
  useRegExpForTypes?: boolean;
  /**
   * Use regular expression to match the field name
   * @default false
   */
  useRegExpForFields?: boolean;
  /**
   * Use regular expression to match the argument name
   * @default false
   */
  useRegExpForArguments?: boolean;
  /**
   * Flags to use in the Regular Expression
   */
  regExpFlags?: string;
  /**
   * Flag to indicate whether certain default types (built-ins, scalars and other types specified an exclusion list) should be renamed or not.
   *
   * @default false
   */
  includeDefaults?: boolean;
}

export interface RenameConfig {
  type?: string;
  field?: string;
  argument?: string;
}

// TODO: For backwards compatibility, remove in the next major
export function createRenameTransform(opts: RenameTransformConfig) {
  const typeRenamers: TypeRenamer[] = opts.typeRenamer ? [opts.typeRenamer] : [];
  const fieldRenamers: FieldRenamer[] = opts.fieldRenamer ? [opts.fieldRenamer] : [];
  const argRenamers: ArgumentRenamer[] = opts.argRenamer ? [opts.argRenamer] : [];
  if (opts.renames?.length) {
    for (const change of opts.renames) {
      const {
        from: { type: fromTypeName, field: fromFieldName, argument: fromArgumentName },
        to: { type: toTypeName, field: toFieldName, argument: toArgumentName },
        useRegExpForTypes,
        useRegExpForFields,
        useRegExpForArguments,
      } = change;
      const includeDefaults = change.includeDefaults === true;

      const regExpFlags = change.regExpFlags || undefined;

      if (fromTypeName !== toTypeName) {
        let replaceTypeNameFn: TypeRenamer;
        if (useRegExpForTypes) {
          const typeNameRegExp = new RegExp(fromTypeName, regExpFlags);
          replaceTypeNameFn = ({ typeName }) => typeName.replace(typeNameRegExp, toTypeName);
        } else {
          replaceTypeNameFn = ({ typeName }) => (typeName === fromTypeName ? toTypeName : typeName);
        }
        typeRenamers.push(({ typeName, type, subgraphConfig }) => {
          if (!includeDefaults && ignoreList.includes(typeName)) {
            return typeName;
          }
          return replaceTypeNameFn({ typeName, type, subgraphConfig });
        });
      }

      if (fromFieldName && toFieldName && fromFieldName !== toFieldName) {
        let replaceFieldNameFn: FieldRenamer;

        if (useRegExpForFields) {
          const fieldNameRegExp = new RegExp(fromFieldName, regExpFlags);
          replaceFieldNameFn = ({ typeName, fieldName }) =>
            typeName === toTypeName ? fieldName.replace(fieldNameRegExp, toFieldName) : fieldName;
        } else {
          replaceFieldNameFn = ({ typeName, fieldName }) =>
            typeName === toTypeName && fieldName === fromFieldName ? toFieldName : fieldName;
        }
        fieldRenamers.push(replaceFieldNameFn);
      }

      if (
        fromTypeName &&
        (fromTypeName === toTypeName || useRegExpForTypes) &&
        toFieldName &&
        (fromFieldName === toFieldName || useRegExpForFields) &&
        fromArgumentName &&
        fromArgumentName !== toArgumentName
      ) {
        let replaceArgNameFn: ArgumentRenamer;

        const fieldNameMatch = (fieldName: string) =>
          fieldName ===
          (useRegExpForFields
            ? fieldName.replace(new RegExp(fromFieldName, regExpFlags), toFieldName)
            : toFieldName);

        const typeNameMatch = (typeName: string) =>
          typeName ===
          (useRegExpForTypes
            ? typeName.replace(new RegExp(fromTypeName, regExpFlags), toTypeName)
            : toTypeName);

        if (useRegExpForArguments) {
          const argNameRegExp = new RegExp(fromArgumentName, regExpFlags);
          replaceArgNameFn = ({ typeName, fieldName, argName }) =>
            typeNameMatch(typeName) && fieldNameMatch(fieldName)
              ? argName.replace(argNameRegExp, toArgumentName)
              : argName;
        } else {
          replaceArgNameFn = ({ typeName, fieldName, argName }) =>
            typeNameMatch(typeName) && fieldNameMatch(fieldName) && argName === fromArgumentName
              ? toArgumentName
              : argName;
        }

        argRenamers.push(replaceArgNameFn);
      }
    }
  }
  return function renameTransform(schema: GraphQLSchema, subgraphConfig: SubgraphConfig) {
    const schemaMapper: SchemaMapper = {};
    const typeRenameMap = new Map<string, string>();
    if (typeRenamers.length) {
      schemaMapper[MapperKind.TYPE] = type => {
        let newTypeName = type.name;
        for (const renamer of typeRenamers) {
          newTypeName =
            renamer({
              typeName: newTypeName,
              type,
              subgraphConfig,
            }) || newTypeName;
        }
        if (newTypeName !== type.name) {
          typeRenameMap.set(type.name, newTypeName);
          return new (Object.getPrototypeOf(type).constructor)({
            ...type.toConfig(),
            name: newTypeName,
          });
        }
        return type;
      };
    }
    const fieldRenameMap = new Map<string, Map<string, string>>();
    schemaMapper[MapperKind.FIELD] = (field, fieldName, typeName, schema) => {
      let newFieldName = fieldName;
      if (fieldRenamers.length) {
        const type = schema.getType(typeName);
        for (const renamer of fieldRenamers) {
          newFieldName =
            renamer({
              typeName,
              fieldName: newFieldName,
              type,
              field,
              subgraphConfig,
            }) || newFieldName;
        }
        let typeFieldRenameMap = fieldRenameMap.get(typeName);
        if (!typeFieldRenameMap) {
          typeFieldRenameMap = new Map();
          fieldRenameMap.set(typeName, typeFieldRenameMap);
        }
        typeFieldRenameMap.set(fieldName, newFieldName);
      }
      const fieldDirectives = getDirectiveExtensions(field, schema);
      if (fieldDirectives.resolveTo) {
        fieldDirectives.resolveTo = fieldDirectives.resolveTo.map(resolveTo => ({
          ...resolveTo,
          sourceTypeName:
            (resolveTo.sourceTypeName && typeRenameMap.get(resolveTo.sourceTypeName)) ||
            resolveTo.sourceTypeName,
          sourceFieldName:
            (resolveTo.sourceFieldName &&
              fieldRenameMap.get(resolveTo.sourceTypeName)?.get(resolveTo.sourceFieldName)) ||
            resolveTo.sourceFieldName,
        }));
        const fieldExtensions: Record<string, any> = (field.extensions ||= {});
        fieldExtensions.directives = fieldDirectives;
      }
      // Do not rewrite `@connect(selection:)` with the connector field's own rename —
      // selection keys are response JSON paths, not GraphQL field names.
      // Do rewrite `$args.*` (arg renames) and `__typename` literals (type renames).
      const argRenameMap = new Map<string, string>();
      let newArgs: GraphQLFieldConfigArgumentMap | undefined;
      if (argRenamers.length && 'args' in field && field.args) {
        newArgs = {};
        for (const argName in field.args) {
          let newArgName = argName;
          for (const renamer of argRenamers) {
            newArgName =
              renamer({
                typeName,
                fieldName,
                argName: newArgName,
                subgraphConfig,
              }) || newArgName;
          }
          if (newArgName !== argName) {
            argRenameMap.set(argName, newArgName);
          }
          newArgs[newArgName] = field.args[argName];
        }
      }
      // Connectors + `@protobuf__rpc` skip Mesh `@source`; rewrite directive binds to
      // the public GraphQL names (same posture as Federation Connectors `$args.*`).
      const rewrittenDirectives = rewriteConnectArgReferences(
        fieldDirectives,
        argRenameMap,
        undefined,
        typeRenameMap.size ? typeRenameMap : undefined,
      );
      if (rewrittenDirectives !== fieldDirectives || newArgs) {
        const fieldExtensions: Record<string, any> = { ...(field.extensions || {}) };
        if (rewrittenDirectives !== fieldDirectives) {
          fieldExtensions.directives = rewrittenDirectives;
        }
        return [
          newFieldName,
          withOriginalKeyFallback(
            {
              ...field,
              ...(rewrittenDirectives !== fieldDirectives
                ? { extensions: fieldExtensions, astNode: undefined }
                : {}),
              ...(newArgs ? { args: newArgs } : {}),
            },
            fieldName,
            newFieldName,
          ),
        ];
      }
      return [newFieldName, withOriginalKeyFallback(field, fieldName, newFieldName)];
    };
    let nextSchema = mapSchema(schema, schemaMapper);
    // Object/input field renames: rewrite `@protobuf__rpc` args/selection path segments
    // across the subgraph (Connect-like; no Mesh `@source` fallback).
    // Keep renames type-scoped so `Review.year→publicationYear` does not rewrite `Movie.year`.
    if (fieldRenameMap.size) {
      nextSchema = mapSchema(nextSchema, {
        [MapperKind.ROOT_FIELD]: (field, _n, _t, s) =>
          applyProtobufFieldRenames(field, fieldRenameMap, s),
        [MapperKind.OBJECT_FIELD]: (field, _n, _t, s) =>
          applyProtobufFieldRenames(field, fieldRenameMap, s),
      });
    }
    return nextSchema;
  };
}

/**
 * Flatten field renames reachable from `rootType` only. Conflicting renames for the
 * same field name across nested types are omitted (safer than a wrong global rewrite).
 */
function collectTypeScopedFieldRenames(
  fieldRenameMap: Map<string, Map<string, string>>,
  rootType: GraphQLNamedType | undefined | null,
): Map<string, string> {
  const flat = new Map<string, string>();
  if (!rootType) {
    return flat;
  }
  const ambiguous = new Set<string>();
  const visited = new Set<string>();
  const visit = (type: GraphQLNamedType) => {
    if (visited.has(type.name)) {
      return;
    }
    visited.add(type.name);
    const typeMap = fieldRenameMap.get(type.name);
    if (typeMap) {
      for (const [from, to] of typeMap) {
        if (!from || !to || from === to || ambiguous.has(from)) {
          continue;
        }
        const existing = flat.get(from);
        if (existing === undefined) {
          flat.set(from, to);
        } else if (existing !== to) {
          flat.delete(from);
          ambiguous.add(from);
        }
      }
    }
    if (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        visit(getNamedType(field.type));
      }
    }
  };
  visit(rootType);
  return flat;
}

function applyProtobufFieldRenames(
  field: GraphQLFieldConfig<any, any>,
  fieldRenameMap: Map<string, Map<string, string>>,
  schema: GraphQLSchema,
): GraphQLFieldConfig<any, any> {
  const selectionRenames = collectTypeScopedFieldRenames(fieldRenameMap, getNamedType(field.type));
  const nestedArgRenames = new Map<string, string>();
  const ambiguousArgs = new Set<string>();
  if (field.args) {
    for (const arg of Object.values(field.args)) {
      const fromArg = collectTypeScopedFieldRenames(fieldRenameMap, getNamedType(arg.type));
      for (const [from, to] of fromArg) {
        if (ambiguousArgs.has(from)) continue;
        const existing = nestedArgRenames.get(from);
        if (existing === undefined) nestedArgRenames.set(from, to);
        else if (existing !== to) {
          nestedArgRenames.delete(from);
          ambiguousArgs.add(from);
        }
      }
    }
  }
  if (!selectionRenames.size && !nestedArgRenames.size) {
    return field;
  }
  const fieldDirectives = getDirectiveExtensions(field, schema);
  const protobufKey = fieldDirectives?.protobuf__rpc?.length
    ? 'protobuf__rpc'
    : fieldDirectives?.protobufRpc?.length
      ? 'protobufRpc'
      : undefined;
  if (!protobufKey) {
    // Connect selections still need a flat pass; scope to return type when possible.
    const rewrittenDirectives = rewriteConnectArgReferences(
      fieldDirectives,
      new Map(),
      selectionRenames.size ? selectionRenames : nestedArgRenames,
      undefined,
    );
    if (!rewrittenDirectives || rewrittenDirectives === fieldDirectives) {
      return field;
    }
    return {
      ...field,
      extensions: {
        ...(field.extensions || {}),
        directives: rewrittenDirectives,
      },
      astNode: undefined,
    };
  }

  let protobufChanged = false;
  const rewrittenRpc = fieldDirectives[protobufKey].map((rpcArgs: any) => {
    let args = rpcArgs?.args;
    let selection = rpcArgs?.selection;
    if (typeof args === 'string' && nestedArgRenames.size) {
      args = rewriteProtobufMappingBinds(args, new Map(), {
        nestedRenameMap: nestedArgRenames,
      });
    }
    if (typeof selection === 'string' && selectionRenames.size) {
      selection = rewriteProtobufMappingBinds(selection, selectionRenames);
    }
    if (args === rpcArgs?.args && selection === rpcArgs?.selection) {
      return rpcArgs;
    }
    protobufChanged = true;
    return { ...rpcArgs, args, selection };
  });
  if (!protobufChanged) {
    return field;
  }
  return {
    ...field,
    extensions: {
      ...(field.extensions || {}),
      directives: {
        ...fieldDirectives,
        [protobufKey]: rewrittenRpc,
      },
    },
    astNode: undefined,
  };
}

type MapperTypeKind =
  | MapperKind.ROOT_OBJECT
  | MapperKind.OBJECT_TYPE
  | MapperKind.INTERFACE_TYPE
  | MapperKind.UNION_TYPE
  | MapperKind.ENUM_TYPE
  | MapperKind.INPUT_OBJECT_TYPE
  | MapperKind.SCALAR_TYPE
  | MapperKind.TYPE;

export function createRenameTypeTransform(
  renameFn: TypeRenamer,
  kind: MapperTypeKind = MapperKind.TYPE,
): SubgraphTransform {
  return function renameTypeTransform(schema: GraphQLSchema, subgraphConfig: SubgraphConfig) {
    const rootTypes: Set<GraphQLNamedType> = getRootTypes(schema);
    const renamedTypeMap = new Map<string, string>();
    const renamedTypes = mapSchema(schema, {
      [kind]: type => {
        if (isSpecifiedScalarType(type) || rootTypes.has(type)) {
          return type;
        }
        const newName =
          renameFn({
            typeName: type.name,
            type,
            subgraphConfig,
          }) || type.name;
        if (type.name === newName) {
          return type;
        }
        renamedTypeMap.set(type.name, newName);
        return new (Object.getPrototypeOf(type).constructor)({
          ...type.toConfig(),
          name: newName,
        });
      },
    });
    const typeRenameForConnect = renamedTypeMap.size ? renamedTypeMap : undefined;
    const renamedFieldAndTypes = mapSchema(renamedTypes, {
      [MapperKind.FIELD](field) {
        const fieldDirectives = getDirectiveExtensions(field, schema);
        if (fieldDirectives?.resolveTo) {
          fieldDirectives.resolveTo = fieldDirectives.resolveTo.map(resolveTo => ({
            ...resolveTo,
            sourceTypeName:
              renamedTypeMap.get(resolveTo.sourceTypeName) || resolveTo.sourceTypeName,
          }));
        }
        const rewrittenDirectives = rewriteConnectArgReferences(
          fieldDirectives,
          new Map(),
          undefined,
          typeRenameForConnect,
        );
        const fieldExtensions: any = (field.extensions ||= {});
        fieldExtensions.directives = rewrittenDirectives || fieldDirectives;
        return field;
      },
      // Type-level `@connect(entity: true)` selections keep `__typename: $("Old")`
      // unless rewritten here (field pass does not see object directives).
      [MapperKind.OBJECT_TYPE](type) {
        if (!typeRenameForConnect) {
          return type;
        }
        const typeDirectives = getDirectiveExtensions(type, schema);
        const rewrittenDirectives = rewriteConnectArgReferences(
          typeDirectives,
          new Map(),
          undefined,
          typeRenameForConnect,
        );
        if (!rewrittenDirectives || rewrittenDirectives === typeDirectives) {
          return type;
        }
        return new GraphQLObjectType({
          ...type.toConfig(),
          extensions: {
            ...(type.extensions || {}),
            directives: rewrittenDirectives,
          },
          astNode: undefined,
        });
      },
    });
    return renamedFieldAndTypes;
  };
}

export type MapperFieldKind =
  | MapperKind.FIELD
  | MapperKind.ROOT_FIELD
  | MapperKind.OBJECT_FIELD
  | MapperKind.INTERFACE_FIELD
  | MapperKind.INPUT_OBJECT_FIELD;

export function createRenameFieldTransform(
  renameFn: FieldRenamer,
  kind: MapperFieldKind = MapperKind.FIELD,
): SubgraphTransform {
  return function renameFieldTransform(schema: GraphQLSchema, subgraphConfig: SubgraphConfig) {
    const fieldRenameMap = new Map<string, Map<string, string>>();
    const fieldRenameMapper = {
      [kind]: (
        field: GraphQLFieldConfig<any, any> | GraphQLInputFieldConfig,
        fieldName: string,
        typeName: string,
      ) => {
        if (fieldName.startsWith('_encapsulated')) {
          return [fieldName, field];
        }
        const type = schema.getType(typeName);
        const newFieldName =
          renameFn({
            typeName,
            fieldName,
            type,
            field,
            subgraphConfig,
          }) || fieldName;
        let typeFieldRenameMap = fieldRenameMap.get(typeName);
        if (!typeFieldRenameMap) {
          typeFieldRenameMap = new Map();
          fieldRenameMap.set(typeName, typeFieldRenameMap);
        }
        typeFieldRenameMap.set(fieldName, newFieldName);
        return [newFieldName, field];
      },
    };
    const resolverUpdaterMapper = {
      [kind]: (
        field: GraphQLFieldConfig<any, any> | GraphQLInputFieldConfig,
        fieldName: string,
      ) => {
        if (fieldName.startsWith('_encapsulated')) {
          return [fieldName, field];
        }
        return [fieldName, resolveToUpdater(field, schema)];
      },
    };
    function resolveToUpdater(
      field: GraphQLFieldConfig<any, any> | GraphQLInputFieldConfig,
      schema: GraphQLSchema,
    ) {
      const fieldDirectives = getDirectiveExtensions(field, schema);
      if (fieldDirectives?.resolveTo) {
        fieldDirectives.resolveTo = fieldDirectives.resolveTo.map(resolveTo => ({
          ...resolveTo,
          sourceFieldName:
            fieldRenameMap.get(resolveTo.sourceTypeName)?.get(resolveTo.sourceFieldName) ||
            resolveTo.sourceFieldName,
        }));
      }
      const fieldExtensions: any = (field.extensions ||= {});
      fieldExtensions.directives = fieldDirectives;
      return field;
    }
    let nextSchema = mapSchema(mapSchema(schema, fieldRenameMapper), resolverUpdaterMapper);
    const flatFieldRenames = flattenFieldRenameMap(fieldRenameMap);
    if (flatFieldRenames.size) {
      nextSchema = mapSchema(nextSchema, {
        [MapperKind.ROOT_FIELD]: (field, _n, _t, s) =>
          applyProtobufFieldRenames(field, flatFieldRenames, s),
        [MapperKind.OBJECT_FIELD]: (field, _n, _t, s) =>
          applyProtobufFieldRenames(field, flatFieldRenames, s),
      });
    }
    return nextSchema;
  };
}
