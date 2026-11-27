import {
  getNamedType,
  getNullableType,
  GraphQLError,
  isAbstractType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isObjectType,
  isUnionType,
  type GraphQLArgument,
  type GraphQLField,
  type GraphQLObjectType,
  type GraphQLSchema,
} from 'graphql';
import { isPlainFieldSelectionMap, resolveLookupKeyField } from '@graphql-mesh/utils';
import { getDirectiveExtensions } from '@graphql-tools/utils';

/**
 * Compose-time checks for Federation Spec draft `@lookup` / `@is` / `@internal`.
 *
 * Rules follow https://graphql.github.io/graphql-federation-spec/draft
 * (Source Schema): lookup return kinds, Query reachability, arg↔field / `@is`
 * maps, plain `@is` selection maps, and `@internal` key-field locality.
 */
export function validateFederationLookupDirectives(schema: GraphQLSchema): GraphQLError[] {
  const errors: GraphQLError[] = [];

  // `@is` only belongs on lookup field arguments (runs even when Query is absent).
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type) && !isInterfaceType(type)) {
      continue;
    }
    const fields = type.getFields();
    for (const fieldName in fields) {
      const field = fields[fieldName]!;
      const fieldDirs = getDirectiveExtensions(field, schema);
      const isLookup = !!fieldDirs?.lookup?.length;
      for (const arg of field.args) {
        const argDirs = getDirectiveExtensions(arg, schema);
        if (argDirs?.is?.length && !isLookup) {
          errors.push(
            new GraphQLError(
              `@is on ${type.name}.${fieldName}(${arg.name}:) is only valid on arguments of @lookup fields`,
              { nodes: arg.astNode || undefined },
            ),
          );
        }
      }
    }
  }

  // `@internal` on any field a `@key` selection references (including nested paths).
  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type) && !isInterfaceType(type)) {
      continue;
    }
    const typeDirs = getDirectiveExtensions(type, schema);
    const keys = typeDirs?.key || [];
    if (!keys.length) {
      continue;
    }
    for (const k of keys as Array<{ fields?: string }>) {
      const fieldsSel = typeof k?.fields === 'string' ? k.fields : '';
      if (!fieldsSel.trim()) {
        continue;
      }
      collectInternalKeyFieldErrors(errors, schema, type as GraphQLObjectType, fieldsSel.trim());
    }
  }

  const queryType = schema.getQueryType();
  if (!queryType) {
    // Still flag every `@lookup` — none are Query-reachable without a Query root.
    for (const type of Object.values(schema.getTypeMap())) {
      if ((!isObjectType(type) && !isInterfaceType(type)) || type.name.startsWith('__')) {
        continue;
      }
      const fields = type.getFields();
      for (const fieldName in fields) {
        const field = fields[fieldName]!;
        const fieldDirs = getDirectiveExtensions(field, schema);
        if (fieldDirs?.lookup?.length) {
          errors.push(
            new GraphQLError(
              `@lookup on ${type.name}.${fieldName} must be reachable from Query via a chain of fields with no arguments`,
              { nodes: field.astNode || undefined },
            ),
          );
        }
      }
    }
    return errors;
  }

  const reachableLookupFields = collectQueryReachableLookupFields(schema, queryType, errors);

  for (const { typeName, fieldName, field, parentIsInternal } of reachableLookupFields) {
    validateLookupField({
      errors,
      schema,
      locationLabel: `field ${typeName}.${fieldName}`,
      field,
      parentIsInternal,
    });
  }

  return errors;
}

type ReachableLookup = {
  typeName: string;
  fieldName: string;
  field: GraphQLField<unknown, unknown>;
  parentIsInternal: boolean;
};

function collectQueryReachableLookupFields(
  schema: GraphQLSchema,
  queryType: GraphQLObjectType,
  errors: GraphQLError[],
): ReachableLookup[] {
  const out: ReachableLookup[] = [];
  const visitedTypes = new Set<string>();

  const walkType = (
    type: GraphQLObjectType,
    ancestorsHaveArgs: boolean,
    parentIsInternal: boolean,
  ) => {
    if (visitedTypes.has(type.name)) {
      return;
    }
    visitedTypes.add(type.name);
    const typeDirs = getDirectiveExtensions(type, schema);
    const typeInternal = parentIsInternal || !!typeDirs?.internal?.length;
    const fields = type.getFields();
    for (const fieldName in fields) {
      const field = fields[fieldName]!;
      const fieldDirs = getDirectiveExtensions(field, schema);
      const fieldInternal = typeInternal || !!fieldDirs?.internal?.length;
      if (fieldDirs?.lookup?.length) {
        if (ancestorsHaveArgs) {
          errors.push(
            new GraphQLError(
              `@lookup on ${type.name}.${fieldName} must be reachable from Query via a chain of fields with no arguments`,
              { nodes: field.astNode || undefined },
            ),
          );
        }
        out.push({
          typeName: type.name,
          fieldName,
          field,
          parentIsInternal: fieldInternal,
        });
      }
      if (field.args.length > 0) {
        continue;
      }
      const named = getNamedType(field.type);
      if (isObjectType(named)) {
        walkType(named, ancestorsHaveArgs, fieldInternal);
      }
    }
  };

  walkType(queryType, false, false);

  const reachableKeys = new Set(out.map(r => `${r.typeName}.${r.fieldName}`));

  // Flag @lookup that is not Query-reachable (Mutation/Subscription, interfaces, or behind args).
  for (const type of Object.values(schema.getTypeMap())) {
    if ((!isObjectType(type) && !isInterfaceType(type)) || type.name.startsWith('__')) {
      continue;
    }
    const fields = type.getFields();
    for (const fieldName in fields) {
      const field = fields[fieldName]!;
      const fieldDirs = getDirectiveExtensions(field, schema);
      if (!fieldDirs?.lookup?.length) {
        continue;
      }
      const key = `${type.name}.${fieldName}`;
      if (reachableKeys.has(key)) {
        continue;
      }
      errors.push(
        new GraphQLError(
          `@lookup on ${type.name}.${fieldName} must be reachable from Query via a chain of fields with no arguments`,
          { nodes: field.astNode || undefined },
        ),
      );
    }
  }

  return out;
}

function validateLookupField(opts: {
  errors: GraphQLError[];
  schema: GraphQLSchema;
  locationLabel: string;
  field: GraphQLField<unknown, unknown>;
  parentIsInternal: boolean;
}) {
  const { errors, schema, locationLabel, field } = opts;
  const namedReturn = getNamedType(field.type);
  const nullable = getNullableType(field.type);

  if (isListType(nullable)) {
    errors.push(
      new GraphQLError(
        `@lookup on ${locationLabel} must return an object, interface, or union type (not a list)`,
        { nodes: field.astNode || undefined },
      ),
    );
    return;
  }

  if (!isObjectType(namedReturn) && !isInterfaceType(namedReturn) && !isUnionType(namedReturn)) {
    errors.push(
      new GraphQLError(
        `@lookup on ${locationLabel} must return an object, interface, or union type`,
        { nodes: field.astNode || undefined },
      ),
    );
    return;
  }

  if (!field.args.length) {
    errors.push(
      new GraphQLError(
        `@lookup on ${locationLabel} must declare at least one argument (stable key)`,
        { nodes: field.astNode || undefined },
      ),
    );
    return;
  }

  const possibleObjects: GraphQLObjectType[] = isObjectType(namedReturn)
    ? [namedReturn]
    : isAbstractType(namedReturn)
      ? (schema.getPossibleTypes(namedReturn) as GraphQLObjectType[])
      : [];

  for (const arg of field.args) {
    validateLookupArgument({
      errors,
      schema,
      locationLabel,
      field,
      arg,
      possibleObjects,
    });
  }
}

function validateLookupArgument(opts: {
  errors: GraphQLError[];
  schema: GraphQLSchema;
  locationLabel: string;
  field: GraphQLField<unknown, unknown>;
  arg: GraphQLArgument;
  possibleObjects: GraphQLObjectType[];
}) {
  const { errors, schema, locationLabel, arg, possibleObjects } = opts;
  const argDirs = getDirectiveExtensions(arg, schema);
  const isApps = argDirs?.is as Array<{ field?: string }> | undefined;
  if (isApps?.length) {
    for (const isApp of isApps) {
      const map = typeof isApp?.field === 'string' ? isApp.field : '';
      if (!map.trim()) {
        errors.push(
          new GraphQLError(
            `@is on ${locationLabel}(${arg.name}:) requires a non-empty field: FieldSelectionMap`,
            { nodes: arg.astNode || undefined },
          ),
        );
        continue;
      }
      if (!isPlainFieldSelectionMap(map)) {
        errors.push(
          new GraphQLError(
            `@is(field:) on ${locationLabel}(${arg.name}:) must be a plain field path without arguments (Federation Spec)`,
            { nodes: arg.astNode || undefined },
          ),
        );
      }
    }
  }

  const keyPath = resolveLookupKeyField(arg.name, isApps);
  // OneOf / alternate maps (`{ id } | { name }`) are not supported by Mesh hop
  // synthesis yet — reject rather than silently accepting incomplete coverage.
  if (keyPath.includes('{') || keyPath.includes('|')) {
    errors.push(
      new GraphQLError(
        `@is(field: "${keyPath}") on ${locationLabel}(${arg.name}:) uses FieldSelectionMap alternatives/object maps that Mesh compose DX does not support yet; use a plain field path`,
        { nodes: arg.astNode || undefined },
      ),
    );
    return;
  }
  const pathParts = keyPath.split('.').filter(Boolean);
  if (!pathParts.length) {
    return;
  }

  for (const objectType of possibleObjects) {
    if (objectHasFieldPath(objectType, pathParts, schema)) {
      continue;
    }
    // Spec: matched field need not exist on *this* source schema, but must exist
    // on the return type in at least one source schema. Within a single subgraph
    // validate we check local return types; missing path is an error when the
    // object is defined here without that field.
    if (pathParts.length === 1 && !isApps?.length && objectType.getFields()[pathParts[0]!] == null) {
      errors.push(
        new GraphQLError(
          `@lookup on ${locationLabel}: argument ${arg.name} must match a field on ${objectType.name} (or use @is(field:))`,
          { nodes: arg.astNode || undefined },
        ),
      );
    } else if (isApps?.length) {
      // Require the full `@is` path when the concrete type is present locally.
      errors.push(
        new GraphQLError(
          `@is(field: "${keyPath}") on ${locationLabel}(${arg.name}:) does not match a field path on ${objectType.name}`,
          { nodes: arg.astNode || undefined },
        ),
      );
    }
  }
}

function objectHasFieldPath(
  type: GraphQLObjectType,
  pathParts: string[],
  schema: GraphQLSchema,
): boolean {
  let current: GraphQLObjectType | null = type;
  for (let i = 0; i < pathParts.length; i++) {
    if (!current) {
      return false;
    }
    const field = current.getFields()[pathParts[i]!];
    if (!field) {
      return false;
    }
    if (i === pathParts.length - 1) {
      return true;
    }
    const next = getNamedType(field.type);
    if (isObjectType(next)) {
      current = next;
    } else if (isInterfaceType(next) || isUnionType(next)) {
      // Nested abstract: accept if any possible type continues the path.
      const rest = pathParts.slice(i + 1);
      return schema
        .getPossibleTypes(next)
        .some(t => isObjectType(t) && objectHasFieldPath(t, rest, schema));
    } else if (isInputObjectType(next)) {
      return false;
    } else {
      return false;
    }
  }
  return true;
}

/** Push errors for `@internal` fields referenced by a `@key(fields:)` selection. */
function collectInternalKeyFieldErrors(
  errors: GraphQLError[],
  schema: GraphQLSchema,
  type: GraphQLObjectType,
  sel: string,
): void {
  let i = 0;
  const s = sel;
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i]!)) {
      i++;
    }
    if (i >= s.length) {
      break;
    }
    if (s[i] === '{') {
      return;
    }
    const start = i;
    while (i < s.length && /[A-Za-z0-9_]/.test(s[i]!)) {
      i++;
    }
    if (i === start) {
      i++;
      continue;
    }
    const name = s.slice(start, i);
    while (i < s.length && /\s/.test(s[i]!)) {
      i++;
    }
    const field = type.getFields()[name];
    if (!field) {
      if (s[i] === '{') {
        // Skip unknown nested block.
        let depth = 0;
        while (i < s.length) {
          if (s[i] === '{') {
            depth++;
          } else if (s[i] === '}') {
            depth--;
            if (depth === 0) {
              i++;
              break;
            }
          }
          i++;
        }
      }
      continue;
    }
    if (s[i] === '{') {
      let depth = 0;
      const blockStart = i;
      while (i < s.length) {
        if (s[i] === '{') {
          depth++;
        } else if (s[i] === '}') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
        i++;
      }
      const inner = s.slice(blockStart + 1, i - 1);
      const named = getNamedType(field.type);
      if (isObjectType(named)) {
        collectInternalKeyFieldErrors(errors, schema, named, inner);
      } else if (isInterfaceType(named) || isUnionType(named)) {
        for (const t of schema.getPossibleTypes(named)) {
          if (isObjectType(t)) {
            collectInternalKeyFieldErrors(errors, schema, t, inner);
          }
        }
      }
      continue;
    }
    const fieldDirs = getDirectiveExtensions(field, schema);
    if (fieldDirs?.internal?.length) {
      errors.push(
        new GraphQLError(
          `@internal on ${type.name}.${name} cannot be used as a @key field (Federation Spec: internal members are local and have no semantic equivalence across source schemas)`,
          { nodes: field.astNode || undefined },
        ),
      );
    }
  }
}
