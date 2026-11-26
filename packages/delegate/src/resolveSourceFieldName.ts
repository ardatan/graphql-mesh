import {
  isObjectType,
  type GraphQLObjectType,
  type GraphQLSchema,
  type GraphQLType,
} from 'graphql';
import { type Subschema } from './Subschema.js';
import { type SubschemaConfig, type Transform } from './types.js';

type HoistLike = {
  typeName: string;
  newFieldName: string;
  oldFieldName: string;
  pathToField: string[];
};

/**
 * Resolve the source/subschema field name for a gateway field that may have been
 * renamed by transforms (RenameObjectFields, TransformCompositeFields, …).
 */
export function resolveSourceFieldName(
  subschema: GraphQLSchema | SubschemaConfig | Subschema,
  typeName: string,
  fieldName: string,
): string {
  const transforms =
    (subschema as Subschema).transforms ?? (subschema as SubschemaConfig).transforms;
  if (!transforms?.length) {
    return fieldName;
  }

  // Compose renames across ordered transforms so gateway → … → source is fully
  // traced (e.g. displayPrice → price → cost), not stopped at the first match.
  let currentName = fieldName;
  let resolved = false;
  for (const transform of transforms) {
    const mapped = readCompositeFieldMapping(transform, typeName, currentName);
    if (mapped != null) {
      currentName = mapped;
      resolved = true;
    }
  }
  return resolved ? currentName : fieldName;
}

/**
 * If `fieldName` on `typeName` was introduced by HoistField, return the hoist
 * metadata so the deferred field can be resolved from the nested source path.
 */
export function getHoistFieldMeta(
  subschema: GraphQLSchema | SubschemaConfig | Subschema,
  typeName: string,
  fieldName: string,
): HoistLike | undefined {
  const transforms =
    (subschema as Subschema).transforms ?? (subschema as SubschemaConfig).transforms;
  if (!transforms?.length) {
    return undefined;
  }
  for (const transform of transforms) {
    const hoist = asHoistLike(transform);
    if (hoist && hoist.typeName === typeName && hoist.newFieldName === fieldName) {
      return hoist;
    }
  }
  return undefined;
}

/**
 * Walk a parent object along a HoistField path and return the nested parent
 * plus the original field name that should be resolved there.
 */
export function getHoistedFieldTarget(
  parent: Record<string, any>,
  hoist: HoistLike,
): { parent: Record<string, any>; fieldName: string } | undefined {
  let current: any = parent;
  for (const segment of hoist.pathToField) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = current[segment];
  }
  if (current == null || typeof current !== 'object') {
    return undefined;
  }
  return { parent: current, fieldName: hoist.oldFieldName };
}

/**
 * Locate the original object type that owns a hoisted field's source field.
 */
export function getHoistedSourceType(
  originalSchema: GraphQLSchema,
  parentTypeName: string,
  hoist: HoistLike,
): GraphQLObjectType | undefined {
  let type: GraphQLObjectType | undefined = (() => {
    const t = originalSchema.getType(parentTypeName);
    return isObjectType(t) ? t : undefined;
  })();
  if (!type) {
    return undefined;
  }
  for (const segment of hoist.pathToField) {
    const field = type.getFields()[segment];
    if (field == null) {
      return undefined;
    }
    const named: GraphQLType = unwrapNamedType(field.type);
    if (!isObjectType(named)) {
      return undefined;
    }
    type = named;
  }
  return type;
}

function unwrapNamedType(type: GraphQLType): GraphQLType {
  let current: GraphQLType = type;
  while (
    current != null &&
    typeof current === 'object' &&
    'ofType' in current &&
    (current as { ofType?: GraphQLType }).ofType
  ) {
    current = (current as { ofType: GraphQLType }).ofType;
  }
  return current;
}

function readCompositeFieldMapping(
  transform: Transform<any, any> | any,
  typeName: string,
  fieldName: string,
): string | undefined {
  let current: any = transform;
  // Unwrap RenameObjectFields -> TransformObjectFields -> TransformCompositeFields
  for (let i = 0; i < 4 && current; i++) {
    const mapped = current.mapping?.[typeName]?.[fieldName];
    if (typeof mapped === 'string') {
      return mapped;
    }
    current = current.transformer;
  }
  return undefined;
}

function asHoistLike(transform: any): HoistLike | undefined {
  if (
    transform &&
    typeof transform.typeName === 'string' &&
    typeof transform.newFieldName === 'string' &&
    typeof transform.oldFieldName === 'string' &&
    Array.isArray(transform.pathToField)
  ) {
    return transform as HoistLike;
  }
  return undefined;
}
