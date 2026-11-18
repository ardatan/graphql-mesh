import {
  getNamedType,
  GraphQLObjectType,
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
import { isNeo4jSubgraph, type SubgraphConfig, type SubgraphTransform } from '../compose.js';
import {
  ensureNeo4jFieldAlias,
  ensureNeo4jTypeIdentity,
  isNeo4jModelTypeDirectives,
  rewriteNeo4jCypherArgReferences,
  rewriteNeo4jRelationshipPropertiesRefs,
  typeConfigWithDirectiveExtensions,
} from './neo4j-identity.js';
import {
  rewriteConnectArgReferences,
  rewriteProtobufMappingBindsTypeScoped,
  rewriteProtobufThisBindsDual,
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
    const neo4j = isNeo4jSubgraph(schema);
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
          const typeDirectives = getDirectiveExtensions(type);
          const withNeo4jIdentity = neo4j
            ? ensureNeo4jTypeIdentity(typeDirectives, type.name)
            : typeDirectives;
          if (withNeo4jIdentity !== typeDirectives && withNeo4jIdentity) {
            return new (Object.getPrototypeOf(type).constructor)({
              ...typeConfigWithDirectiveExtensions(type, withNeo4jIdentity),
              name: newTypeName,
            });
          }
          return new (Object.getPrototypeOf(type).constructor)({
            ...type.toConfig(),
            name: newTypeName,
          });
        }
        return type;
      };
    }
    const fieldRenameMap = new Map<string, Map<string, string>>();
    /** Public `Type.field` → arg rename map (for root-field `$this` args fallback). */
    const argRenamesByPublicField = new Map<string, Map<string, string>>();
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
      if (argRenameMap.size) {
        const publicType = typeRenameMap.get(typeName) ?? typeName;
        argRenamesByPublicField.set(`${publicType}.${newFieldName}`, argRenameMap);
      }
      // Connectors skip Mesh `@source`; rewrite `$args.*` / `__typename` here.
      // Protobuf `$args` / nested binds wait for `applyProtobufFieldRenames` (one pass).
      // Neo4j (transport-gated) rewrites `@cypher` `$arg` binds and stamps `@alias(property:)`.
      let rewrittenDirectives = rewriteConnectArgReferences(
        fieldDirectives,
        argRenameMap,
        undefined,
        typeRenameMap.size ? typeRenameMap : undefined,
        false,
      );
      if (neo4j) {
        rewrittenDirectives = rewriteNeo4jCypherArgReferences(rewrittenDirectives, argRenameMap);
        rewrittenDirectives = rewriteNeo4jRelationshipPropertiesRefs(
          rewrittenDirectives,
          typeRenameMap,
        );
        if (newFieldName !== fieldName) {
          const parentType = schema.getType(typeName);
          const parentDirectives = parentType
            ? getDirectiveExtensions(parentType, schema)
            : undefined;
          rewrittenDirectives = ensureNeo4jFieldAlias(rewrittenDirectives, fieldName, {
            isNeo4jModelField: isNeo4jModelTypeDirectives(parentDirectives),
            subgraph:
              parentDirectives?.node?.[0]?.subgraph ||
              parentDirectives?.relationshipProperties?.[0]?.subgraph,
          });
        }
      }
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
    // Also rewrite object-level entity RPCs (type directives), not only field-level.
    // Field mappers record renames under the pre-rename type name; rekey to the public
    // type name so object-level `$this.*` / selection lookups hit after type rename.
    // Build a fresh map so chained type renames (Pet→Animal, Animal→Creature) each
    // apply once from the original key and do not depend on iteration order.
    if (fieldRenameMap.size && typeRenameMap.size) {
      const rekeyed = new Map<string, Map<string, string>>();
      for (const [originalName, fields] of fieldRenameMap) {
        const publicName = typeRenameMap.get(originalName) ?? originalName;
        let dest = rekeyed.get(publicName);
        if (!dest) {
          dest = new Map();
          rekeyed.set(publicName, dest);
        }
        for (const [oldField, newField] of fields) {
          dest.set(oldField, newField);
        }
      }
      fieldRenameMap.clear();
      for (const [typeName, fields] of rekeyed) {
        fieldRenameMap.set(typeName, fields);
      }
    }
    if (fieldRenameMap.size || argRenamesByPublicField.size) {
      nextSchema = mapSchema(nextSchema, {
        [MapperKind.ROOT_FIELD]: (field, fieldName, typeName, s) =>
          applyProtobufFieldRenames(
            field,
            fieldRenameMap,
            s,
            typeName,
            argRenamesByPublicField.get(`${typeName}.${fieldName}`),
          ),
        [MapperKind.OBJECT_FIELD]: (field, fieldName, typeName, s) =>
          applyProtobufFieldRenames(
            field,
            fieldRenameMap,
            s,
            typeName,
            argRenamesByPublicField.get(`${typeName}.${fieldName}`),
          ),
        [MapperKind.OBJECT_TYPE]: (type, s) => applyProtobufTypeRenames(type, fieldRenameMap, s),
      });
    }
    return nextSchema;
  };
}

export function applyProtobufFieldRenames(
  field: GraphQLFieldConfig<any, any>,
  fieldRenameMap: Map<string, Map<string, string>>,
  schema: GraphQLSchema,
  parentTypeName?: string,
  argRenameMap?: Map<string, string>,
): GraphQLFieldConfig<any, any> {
  if (!fieldRenameMap.size && !argRenameMap?.size) {
    return field;
  }
  const fieldDirectives = getDirectiveExtensions(field, schema);
  const protobufKey = fieldDirectives?.protobuf__rpc?.length
    ? 'protobuf__rpc'
    : fieldDirectives?.protobufRpc?.length
      ? 'protobufRpc'
      : undefined;
  if (!protobufKey) {
    return field;
  }

  const returnType = getNamedType(field.type);
  const argTypes = new Map<string, GraphQLNamedType>();
  if (field.args) {
    for (const [argName, arg] of Object.entries(field.args)) {
      argTypes.set(argName, getNamedType(arg.type));
    }
  }
  const parentType = parentTypeName ? schema.getType(parentTypeName) : undefined;
  const rootTypes = getRootTypes(schema);
  const parentIsRoot = Boolean(parentType && rootTypes.has(parentType as any));
  // Non-root owner supplies parent field renames for `$this` dual binds.
  const thisOwnerType =
    parentType && !parentIsRoot && (isObjectType(parentType) || isInterfaceType(parentType))
      ? parentType
      : undefined;
  const parentFieldRenames = thisOwnerType ? fieldRenameMap.get(thisOwnerType.name) : undefined;

  let protobufChanged = false;
  const rewrittenRpc = fieldDirectives[protobufKey].map((rpcArgs: any) => {
    let args = rpcArgs?.args;
    let selection = rpcArgs?.selection;
    if (typeof args === 'string') {
      // Nested input / relative binds; leave `$this` paths for the dual-bind pass.
      // Pass parent owner so `$this.<field>` nested renames use the parent field type;
      // `argTypes` remains the fallback when there is no parent (root fields).
      if (fieldRenameMap.size || argRenameMap?.size || argTypes.size) {
        args = rewriteProtobufMappingBindsTypeScoped(args, fieldRenameMap, {
          argTypes,
          argRenameMap,
          skipThisBinds: true,
          rootType: thisOwnerType,
        });
      }
      // Dual `$this.<parent>|$args.<arg>` when parent field and arg renames diverge.
      // Nested parent paths walk owning GraphQL types (e.g. `$this.address.street_name`).
      if (
        parentFieldRenames?.size ||
        argRenameMap?.size ||
        (thisOwnerType && fieldRenameMap.size) ||
        (fieldRenameMap.size && argTypes.size)
      ) {
        args = rewriteProtobufThisBindsDual(args, {
          parentRenames: parentFieldRenames,
          argRenames: argRenameMap,
          fieldRenameMap,
          ownerType: thisOwnerType ?? null,
          argTypes,
        });
      }
    }
    if (typeof selection === 'string' && returnType && fieldRenameMap.size) {
      selection = rewriteProtobufMappingBindsTypeScoped(selection, fieldRenameMap, {
        rootType: returnType,
      });
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

/** Object-level `@protobuf__rpc` (entity / type-level) — rewrite selection + `$this` against the owning type. */
export function applyProtobufTypeRenames(
  type: GraphQLObjectType,
  fieldRenameMap: Map<string, Map<string, string>>,
  schema: GraphQLSchema,
): GraphQLObjectType {
  if (!fieldRenameMap.size) {
    return type;
  }
  const typeDirectives = getDirectiveExtensions(type, schema);
  const protobufKey = typeDirectives?.protobuf__rpc?.length
    ? 'protobuf__rpc'
    : typeDirectives?.protobufRpc?.length
      ? 'protobufRpc'
      : undefined;
  if (!protobufKey) {
    return type;
  }

  let protobufChanged = false;
  const rewrittenRpc = typeDirectives[protobufKey].map((rpcArgs: any) => {
    let args = rpcArgs?.args;
    let selection = rpcArgs?.selection;
    if (typeof args === 'string') {
      args = rewriteProtobufMappingBindsTypeScoped(args, fieldRenameMap, { rootType: type });
    }
    if (typeof selection === 'string') {
      selection = rewriteProtobufMappingBindsTypeScoped(selection, fieldRenameMap, {
        rootType: type,
      });
    }
    if (args === rpcArgs?.args && selection === rpcArgs?.selection) {
      return rpcArgs;
    }
    protobufChanged = true;
    return { ...rpcArgs, args, selection };
  });
  if (!protobufChanged) {
    return type;
  }
  return new GraphQLObjectType({
    ...type.toConfig(),
    extensions: {
      ...(type.extensions || {}),
      directives: {
        ...typeDirectives,
        [protobufKey]: rewrittenRpc,
      },
    },
    astNode: undefined,
  });
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
    const neo4j = isNeo4jSubgraph(schema);
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
        const typeDirectives = getDirectiveExtensions(type, schema);
        const withNeo4jIdentity = neo4j
          ? ensureNeo4jTypeIdentity(typeDirectives, type.name)
          : typeDirectives;
        if (withNeo4jIdentity !== typeDirectives && withNeo4jIdentity) {
          return new (Object.getPrototypeOf(type).constructor)({
            ...typeConfigWithDirectiveExtensions(type, withNeo4jIdentity),
            name: newName,
          });
        }
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
        let rewrittenDirectives = rewriteConnectArgReferences(
          fieldDirectives,
          new Map(),
          undefined,
          typeRenameForConnect,
        );
        if (neo4j) {
          rewrittenDirectives = rewriteNeo4jRelationshipPropertiesRefs(
            rewrittenDirectives,
            renamedTypeMap,
          );
        }
        if (rewrittenDirectives === fieldDirectives) {
          if (fieldDirectives?.resolveTo) {
            const fieldExtensions: any = (field.extensions ||= {});
            fieldExtensions.directives = fieldDirectives;
          }
          return field;
        }
        // Drop stale AST so a later rename pass does not merge old `@relationship(properties:)`.
        return {
          ...field,
          extensions: {
            ...(field.extensions || {}),
            directives: rewrittenDirectives,
          },
          astNode: undefined,
        };
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
          ...typeConfigWithDirectiveExtensions(type, rewrittenDirectives),
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
    const neo4j = isNeo4jSubgraph(schema);
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
        if (newFieldName === fieldName) {
          return [newFieldName, field];
        }
        if (!neo4j) {
          return [newFieldName, field];
        }
        const parentType = schema.getType(typeName);
        const parentDirectives = parentType
          ? getDirectiveExtensions(parentType, schema)
          : undefined;
        const fieldDirectives = getDirectiveExtensions(field, schema);
        const withAlias = ensureNeo4jFieldAlias(fieldDirectives, fieldName, {
          isNeo4jModelField: isNeo4jModelTypeDirectives(parentDirectives),
          subgraph:
            parentDirectives?.node?.[0]?.subgraph ||
            parentDirectives?.relationshipProperties?.[0]?.subgraph,
        });
        if (withAlias === fieldDirectives) {
          return [newFieldName, field];
        }
        return [
          newFieldName,
          {
            ...field,
            extensions: {
              ...(field.extensions || {}),
              directives: withAlias,
            },
            astNode: undefined,
          },
        ];
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
    // Same type-scoped protobuf bind rewrite as `createRenameTransform`.
    if (fieldRenameMap.size) {
      nextSchema = mapSchema(nextSchema, {
        [MapperKind.ROOT_FIELD]: (field, _n, typeName, s) =>
          applyProtobufFieldRenames(field, fieldRenameMap, s, typeName),
        [MapperKind.OBJECT_FIELD]: (field, _n, typeName, s) =>
          applyProtobufFieldRenames(field, fieldRenameMap, s, typeName),
        [MapperKind.OBJECT_TYPE]: (type, s) => applyProtobufTypeRenames(type, fieldRenameMap, s),
      });
    }
    return nextSchema;
  };
}
