import type {
  GraphQLArgument,
  GraphQLArgumentConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLSchema,
} from 'graphql';
import { isOutputType, parseType, typeFromAST, visit } from 'graphql';
import type { Transform } from '@graphql-tools/delegate';
import { getDirectiveExtensions, MapperKind, mapSchema } from '@graphql-tools/utils';
import {
  HoistField,
  PruneSchema,
  RenameInputObjectFields,
  RenameInterfaceFields,
  RenameObjectFieldArguments,
  RenameObjectFields,
  RenameTypes,
  TransformEnumValues,
  wrapSchema,
} from '@graphql-tools/wrap';

interface SourceDirective {
  subgraph?: string;
  name?: string;
  type?: string;
  /** Apollo Connectors SCHEMA `@source` carries `http` — not Mesh stitching. */
  http?: unknown;
}

function isMeshSourceSpecUrl(url: unknown): boolean {
  if (typeof url !== 'string') {
    return false;
  }
  // Current core `@link` plus the older Mesh source `@link` still seen on
  // existing subgraph SDL. Unpublished intermediate prefixes are not accepted.
  return (
    url === 'https://the-guild.dev/graphql/mesh/spec/v1.0' ||
    url.startsWith('https://the-guild.dev/graphql/mesh/spec/') ||
    url.startsWith('https://specs.graphql-mesh.dev/core/')
  );
}

/** Apollo Federation Connectors `@link` (SCHEMA `@source` / `@connect`). */
export function isApolloConnectorsSpecUrl(url: unknown): boolean {
  return typeof url === 'string' && url.startsWith('https://specs.apollo.dev/connect');
}

function linkImportsSourceDirective(
  linkDirective: { import?: unknown[] },
  /** Local name without `@`, e.g. `source` or `meshSource`. */
  wantLocalName?: string,
): string | undefined {
  for (const importInfo of linkDirective.import || []) {
    if (importInfo === '@source') {
      if (!wantLocalName || wantLocalName === 'source') {
        return 'source';
      }
      continue;
    }
    if (importInfo === '@meshSource') {
      if (!wantLocalName || wantLocalName === 'meshSource') {
        return 'meshSource';
      }
      continue;
    }
    if (importInfo && typeof importInfo === 'object') {
      const name = (importInfo as { name?: string }).name;
      const alias = (importInfo as { as?: string }).as;
      if (name === '@source' || name === '@meshSource') {
        const local =
          typeof alias === 'string'
            ? alias.startsWith('@')
              ? alias.slice(1)
              : undefined
            : name === '@meshSource'
              ? 'meshSource'
              : 'source';
        if (!local) {
          continue;
        }
        if (!wantLocalName || wantLocalName === local) {
          return local;
        }
      }
    }
  }
  return undefined;
}

/**
 * Resolve the Mesh stitching `@source` / `@meshSource` directive name from
 * schema `@link` imports (Mesh core / Guild Mesh spec URLs only).
 *
 * Apollo Connectors SCHEMA `@source` is imported from
 * `https://specs.apollo.dev/connect/...` and is never returned here — when both
 * appear in one schema, Mesh is aliased (typically `@meshSource`) so the names
 * do not clash.
 */
export function getMeshSourceDirectiveName(
  schemaExtensions: Record<string, any> | undefined,
): string | undefined {
  const linkDirectives = schemaExtensions?.directives?.link;
  if (!Array.isArray(linkDirectives)) {
    return undefined;
  }
  for (const linkDirective of linkDirectives) {
    if (!isMeshSourceSpecUrl(linkDirective?.url)) {
      continue;
    }
    const local = linkImportsSourceDirective(linkDirective);
    if (local) {
      return local;
    }
  }
  return undefined;
}

/**
 * Resolve Apollo Connectors SCHEMA `@source` local name from `@link` imports
 * (`https://specs.apollo.dev/connect/...`). Undefined when Connectors do not
 * import `@source` (Mesh-only graphs).
 */
export function getApolloConnectorsSourceDirectiveName(
  schemaExtensions: Record<string, any> | undefined,
): string | undefined {
  const linkDirectives = schemaExtensions?.directives?.link;
  if (!Array.isArray(linkDirectives)) {
    return undefined;
  }
  for (const linkDirective of linkDirectives) {
    if (!isApolloConnectorsSpecUrl(linkDirective?.url)) {
      continue;
    }
    // Connectors import `@source` (optionally aliased); never `@meshSource`.
    for (const importInfo of linkDirective.import || []) {
      if (importInfo === '@source') {
        return 'source';
      }
      if (importInfo && typeof importInfo === 'object' && importInfo.name === '@source') {
        const alias = importInfo.as;
        if (typeof alias === 'string') {
          return alias.startsWith('@') ? alias.slice(1) : undefined;
        }
        return 'source';
      }
    }
  }
  return undefined;
}

function isApolloConnectorsSource(directive: SourceDirective | null | undefined): boolean {
  return directive != null && directive.http != null;
}

function isMeshStitchingSource(directive: SourceDirective | null | undefined): boolean {
  if (directive == null || isApolloConnectorsSource(directive)) {
    return false;
  }
  // Mesh stitching stamps `subgraph` and/or original `name` / `type`.
  return directive.subgraph != null || directive.name != null || directive.type != null;
}

function getMeshSourceDirectives(
  directives: Record<string, any> | undefined,
  meshSourceDirectiveName: string | undefined,
): SourceDirective[] | undefined {
  if (!meshSourceDirectiveName) {
    return undefined;
  }
  const candidates = directives?.[meshSourceDirectiveName] as SourceDirective[] | undefined;
  if (!candidates?.length) {
    return undefined;
  }
  // Belt-and-suspenders: never treat SCHEMA `@source(http:)` as a rename stamp
  // even if a mis-linked name pointed here.
  const meshOnly = candidates.filter(isMeshStitchingSource);
  return meshOnly.length ? meshOnly : undefined;
}

/**
 * Resolve the Mesh stitching source directive name for a schema.
 *
 * 1. Prefer Mesh `@link` import (`@source` / `@meshSource` / alias).
 * 2. If Apollo Connectors `@link` owns `@source`, do **not** fall back to bare
 *    `source` — Mesh must use `@meshSource` (or another alias) to avoid a clash.
 * 3. Otherwise allow unlinked Mesh SDL: `meshSource` def, or Mesh-shaped
 *    `source` stamps (no `http`).
 */
function resolveMeshSourceDirectiveNameForSchema(schema: GraphQLSchema): string | undefined {
  // Prefer directive apps from AST/extensions (`getDirectiveExtensions` merges both).
  const schemaExtensions = {
    directives: getDirectiveExtensions(schema) || {},
  };
  const fromLink = getMeshSourceDirectiveName(schemaExtensions);
  if (fromLink) {
    return fromLink;
  }
  const apolloSourceName = getApolloConnectorsSourceDirectiveName(schemaExtensions);
  if (schema.getDirective('meshSource')) {
    return 'meshSource';
  }
  // Apollo Connectors already claimed `source` via `@link` — do not steal it.
  if (apolloSourceName != null) {
    return undefined;
  }
  if (schema.getDirective('source')) {
    return 'source';
  }
  return undefined;
}

/**
 * True when the schema carries Mesh stitching `@source` / `@meshSource` rename
 * (or hoist) stamps — never Apollo Connectors SCHEMA `@source` (disambiguated
 * via `@link` import URL).
 */
export function schemaHasMeshSourceTransforms(schema: GraphQLSchema): boolean {
  const meshSourceDirectiveName = resolveMeshSourceDirectiveNameForSchema(schema);

  for (const type of Object.values(schema.getTypeMap())) {
    if (type.name.startsWith('__')) continue;
    const typeDirs = getDirectiveExtensions(type);
    if (getMeshSourceDirectives(typeDirs, meshSourceDirectiveName)?.length) {
      return true;
    }
    if (typeDirs?.hoist?.length) {
      return true;
    }
    if (!('getFields' in type)) continue;
    for (const field of Object.values(type.getFields())) {
      const fieldDirs = getDirectiveExtensions(field);
      if (getMeshSourceDirectives(fieldDirs, meshSourceDirectiveName)?.length) {
        return true;
      }
      if (fieldDirs?.hoist?.length) {
        return true;
      }
      if ('args' in field && field.args) {
        for (const arg of field.args) {
          const argDirs = getDirectiveExtensions(arg);
          if (getMeshSourceDirectives(argDirs, meshSourceDirectiveName)?.length) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function parseTypeNodeWithRenames(typeString: string, renameTypeNames: Record<string, string>) {
  const typeNode = parseType(typeString);
  return visit(typeNode, {
    NamedType: node => {
      const realName = renameTypeNames[node.name.value] ?? node.name.value;
      return {
        ...node,
        name: {
          ...node.name,
          value: realName,
        },
      };
    },
  });
}

export interface ApplyMeshSourceTransformsResult {
  /** Schema with original (upstream) names restored from `@source(name:)`. */
  schema: GraphQLSchema;
  /** Transforms that re-apply public names (pass to `wrapSchema`). */
  transforms: Transform[];
}

/**
 * Reverse Mesh `@source` / `@meshSource` stamps the same way Hive Gateway does
 * for stamped subgraph SDL: restore original type/field/arg/enum names, collect
 * wrap transforms (and `@hoist`) so the public surface stays renamed.
 *
 * No-op when the schema has no Mesh stitching source stamps (Apollo SCHEMA
 * `@source(http:)` alone does not count).
 */
export function extractMeshSourceTransforms(
  schema: GraphQLSchema,
): ApplyMeshSourceTransformsResult {
  if (!schemaHasMeshSourceTransforms(schema)) {
    return { schema, transforms: [] };
  }

  // Ensure extensions bag exists for downstream consumers that mutate it.
  schema.extensions ||= {};
  const meshSourceDirectiveName = resolveMeshSourceDirectiveNameForSchema(schema);

  const renameTypeNames: Record<string, string> = {};
  const renameTypeNamesReversed: Record<string, string> = {};
  const renameFieldByObjectTypeNames: Record<string, Record<string, string>> = {};
  const renameFieldByInputTypeNames: Record<string, Record<string, string>> = {};
  const renameFieldByInterfaceTypeNames: Record<string, Record<string, string>> = {};
  const renameEnumValueByEnumTypeNames: Record<string, Record<string, string>> = {};
  const renameFieldByTypeNamesReversed: Record<string, Record<string, string>> = {};
  const renameArgByFieldByTypeNames: Record<string, Record<string, Record<string, string>>> = {};
  const transforms: Transform[] = [];

  // Standalone subgraph: accept every Mesh `@source` stamp (no multi-subgraph filter).
  const takeSource = (dirs: Record<string, any> | undefined) =>
    getMeshSourceDirectives(dirs, meshSourceDirectiveName)?.[0];

  const nextSchema = mapSchema(schema, {
    [MapperKind.TYPE]: type => {
      const sourceDirective = takeSource(getDirectiveExtensions(type));
      if (sourceDirective != null) {
        const realName = sourceDirective.name || type.name;
        if (type.name !== realName) {
          renameTypeNames[realName] = type.name;
          renameTypeNamesReversed[type.name] = realName;
          return new (Object.getPrototypeOf(type).constructor)({
            ...type.toConfig(),
            name: realName,
          });
        }
      }
      return undefined;
    },
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName, mappedSchema) => {
      const fieldDirectives = getDirectiveExtensions(fieldConfig);
      const sourceDirective = takeSource(fieldDirectives);
      const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
      const realName = sourceDirective?.name ?? fieldName;
      if (fieldName !== realName) {
        if (!renameFieldByObjectTypeNames[realTypeName]) {
          renameFieldByObjectTypeNames[realTypeName] = {};
        }
        renameFieldByObjectTypeNames[realTypeName][realName] = fieldName;
        if (!renameFieldByTypeNamesReversed[realTypeName]) {
          renameFieldByTypeNamesReversed[realTypeName] = {};
        }
        renameFieldByTypeNamesReversed[realTypeName][fieldName] = realName;
      }
      const hoistDirectives = fieldDirectives.hoist;
      if (hoistDirectives?.length) {
        for (const hoistDirective of hoistDirectives) {
          const pathConfig: {
            fieldName: string;
            argFilter?: (arg: GraphQLArgument) => boolean;
          }[] = (hoistDirective.pathConfig || []).map((annotation: any) => {
            if (typeof annotation === 'string') {
              return {
                fieldName: annotation,
                argFilter: () => true,
              };
            }
            return {
              fieldName: annotation.fieldName,
              argFilter: annotation.filterArgs
                ? (arg: any) => !annotation.filterArgs.includes(arg.name)
                : () => true,
            };
          });
          if (pathConfig.length) {
            transforms.push(new HoistField(realTypeName, pathConfig, fieldName), new PruneSchema());
          }
        }
      }
      const newArgs: GraphQLFieldConfigArgumentMap = {};
      if (fieldConfig.args) {
        for (const argName in fieldConfig.args) {
          const argConfig: GraphQLArgumentConfig = fieldConfig.args[argName]!;
          const argSourceDirective = takeSource(getDirectiveExtensions(argConfig));
          if (argSourceDirective != null) {
            const realArgName = argSourceDirective.name ?? argName;
            newArgs[realArgName] = argConfig;
            if (realArgName !== argName) {
              if (!renameArgByFieldByTypeNames[realTypeName]) {
                renameArgByFieldByTypeNames[realTypeName] = {};
              }
              if (!renameArgByFieldByTypeNames[realTypeName][realName]) {
                renameArgByFieldByTypeNames[realTypeName][realName] = {};
              }
              renameArgByFieldByTypeNames[realTypeName][realName][realArgName] = argName;
            }
          } else {
            newArgs[argName] = argConfig;
          }
        }
      }
      let fieldType = fieldConfig.type;
      if (sourceDirective?.type) {
        const fieldTypeNode = parseTypeNodeWithRenames(sourceDirective.type, renameTypeNames);
        const newType = typeFromAST(mappedSchema, fieldTypeNode);
        if (!newType) {
          throw new Error(
            `Type ${sourceDirective.type} for field ${typeName}.${fieldName} is not defined in the schema`,
          );
        }
        if (!isOutputType(newType)) {
          throw new Error(
            `Type ${sourceDirective.type} for field ${typeName}.${fieldName} is not an output type`,
          );
        }
        fieldType = newType;
      }
      return [
        realName,
        {
          ...fieldConfig,
          type: fieldType,
          args: newArgs,
        },
      ];
    },
    [MapperKind.INPUT_OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      const sourceDirective = takeSource(getDirectiveExtensions(fieldConfig));
      if (sourceDirective != null) {
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        const realName = sourceDirective.name ?? fieldName;
        if (fieldName !== realName) {
          if (!renameFieldByInputTypeNames[realTypeName]) {
            renameFieldByInputTypeNames[realTypeName] = {};
          }
          renameFieldByInputTypeNames[realTypeName][realName] = fieldName;
        }
        return [realName, fieldConfig];
      }
      return undefined;
    },
    [MapperKind.INTERFACE_FIELD]: (fieldConfig, fieldName, typeName) => {
      const sourceDirective = takeSource(getDirectiveExtensions(fieldConfig));
      if (sourceDirective != null) {
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        const realName = sourceDirective.name ?? fieldName;
        if (fieldName !== realName) {
          if (!renameFieldByInterfaceTypeNames[realTypeName]) {
            renameFieldByInterfaceTypeNames[realTypeName] = {};
          }
          renameFieldByInterfaceTypeNames[realTypeName][realName] = fieldName;
        }
        return [realName, fieldConfig];
      }
      return undefined;
    },
    [MapperKind.ENUM_VALUE]: (enumValueConfig, typeName, _schema, externalValue) => {
      const sourceDirective = takeSource(getDirectiveExtensions(enumValueConfig));
      if (sourceDirective != null) {
        const realValue = sourceDirective.name ?? externalValue;
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        if (externalValue !== realValue) {
          if (!renameEnumValueByEnumTypeNames[realTypeName]) {
            renameEnumValueByEnumTypeNames[realTypeName] = {};
          }
          renameEnumValueByEnumTypeNames[realTypeName][realValue] = externalValue;
        }
        return [
          realValue,
          {
            ...enumValueConfig,
            value: realValue,
          },
        ];
      }
      return undefined;
    },
  });

  if (Object.keys(renameTypeNames).length > 0) {
    transforms.push(new RenameTypes(typeName => renameTypeNames[typeName] || typeName));
  }
  if (Object.keys(renameFieldByObjectTypeNames).length > 0) {
    transforms.push(
      new RenameObjectFields((typeName, fieldName) => {
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        return renameFieldByObjectTypeNames[realTypeName]?.[fieldName] ?? fieldName;
      }),
    );
  }
  if (Object.keys(renameFieldByInputTypeNames).length > 0) {
    transforms.push(
      new RenameInputObjectFields((typeName, fieldName) => {
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        return renameFieldByInputTypeNames[realTypeName]?.[fieldName] ?? fieldName;
      }),
    );
  }
  if (Object.keys(renameFieldByInterfaceTypeNames).length > 0) {
    transforms.push(
      new RenameInterfaceFields((typeName, fieldName) => {
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        return renameFieldByInterfaceTypeNames[realTypeName]?.[fieldName] ?? fieldName;
      }),
    );
  }
  if (Object.keys(renameEnumValueByEnumTypeNames).length > 0) {
    transforms.push(
      new TransformEnumValues((typeName, externalValue, enumValueConfig) => {
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        const realValue =
          renameEnumValueByEnumTypeNames[realTypeName]?.[enumValueConfig.value || externalValue] ??
          enumValueConfig.value;
        return [
          realValue,
          {
            ...enumValueConfig,
            value: realValue,
          },
        ];
      }),
    );
  }
  if (Object.keys(renameArgByFieldByTypeNames).length > 0) {
    transforms.push(
      new RenameObjectFieldArguments((typeName, fieldName, argName) => {
        const realTypeName = renameTypeNamesReversed[typeName] ?? typeName;
        const realFieldName =
          renameFieldByTypeNamesReversed[realTypeName]?.[fieldName] ?? fieldName;
        return renameArgByFieldByTypeNames[realTypeName]?.[realFieldName]?.[argName] ?? argName;
      }),
    );
  }

  return { schema: nextSchema, transforms };
}

/**
 * Apply Mesh `@source` reverse-renames and wrap so the public schema keeps
 * stamped names while transports execute against original names.
 */
export function applyMeshSourceTransforms(schema: GraphQLSchema): GraphQLSchema {
  const { schema: reversed, transforms } = extractMeshSourceTransforms(schema);
  if (!transforms.length) {
    return reversed;
  }
  return wrapSchema({
    schema: reversed,
    transforms,
  });
}
