import {
  getNullableType,
  GraphQLError,
  isAbstractType,
  type GraphQLObjectType,
  type GraphQLResolveInfo,
  type GraphQLTypeResolver,
} from 'graphql';
import { getConnectArgsFromNode } from './connect.js';

export function getTypeResolverForAbstractType({
  possibleTypes,
  discriminatorField,
  discriminatorMapping,
  statusCodeTypeNameMap,
  serviceName,
}: {
  possibleTypes: readonly GraphQLObjectType[];
  discriminatorField?: string;
  discriminatorMapping?: [string, string][];
  statusCodeTypeNameMap?: Record<string, string>;
  serviceName?: string;
}): GraphQLTypeResolver<any, any> {
  const discriminatorMappingObj = Array.isArray(discriminatorMapping)
    ? Object.fromEntries(discriminatorMapping)
    : discriminatorMapping;
  return function resolveType(data: any, _ctx: any, info: GraphQLResolveInfo) {
    if (data.__typename) {
      const hinted = info.schema.getType(data.__typename);
      // Connectors/`$status->match` may emit an interface name when OpenAPI maps a
      // status onto a discriminator parent — finish via that abstract type's resolver.
      if (isAbstractType(hinted)) {
        const resolved = hinted.resolveType?.(data, _ctx, info, hinted);
        if (resolved) {
          return resolved;
        }
      } else {
        return data.__typename;
      }
    }

    // OData: `#Namespace.Type` → GraphQL object among possibleTypes (no `@abstractType`).
    const odataType = data?.['@odata.type'];
    if (typeof odataType === 'string') {
      const shortName = odataType.replace(/^#/, '').split('.').pop()!;
      const match =
        possibleTypes.find(t => t.name === shortName) ||
        // Abstract OData entity: interface `Foo` + concrete companion `TFoo`
        possibleTypes.find(t => t.name === `T${shortName}`) ||
        possibleTypes.find(
          t => t.name.endsWith(`_${shortName}`) || t.name.endsWith(`_T${shortName}`),
        );
      if (match) {
        return match.name;
      }
      // Do not fall back to schema-wide `getType(shortName)` — an unmatched
      // `@odata.type` (e.g. `#Service.Error`) must not pick an unrelated type
      // outside `possibleTypes` (GraphQL rejects that result).
    }

    if (discriminatorField != null && data[discriminatorField]) {
      const discriminatorValue = data[discriminatorField];
      return discriminatorMappingObj?.[discriminatorValue] || discriminatorValue;
    }
    if (data.$statusCode && statusCodeTypeNameMap) {
      const typeName =
        statusCodeTypeNameMap[data.$statusCode.toString()] || statusCodeTypeNameMap.default;
      if (typeName) {
        const type = info.schema.getType(typeName);
        if (isAbstractType(type)) {
          const resolved = type.resolveType?.(data, _ctx, info, type);
          if (resolved) {
            return resolved;
          }
        }
        return typeName;
      }
    }

    // Thrift TJSON / union selections stamp `__throw_<TypeName>: true` from the
    // reply field id. Prefer that over field-name scoring so shared exception
    // fields (e.g. `message`) cannot pick the wrong member after SDL rebuild
    // (closures from the loader do not survive print/processDirectives).
    if (data != null && typeof data === 'object') {
      for (const possibleType of possibleTypes) {
        if (data[`__throw_${possibleType.name}`] === true) {
          return possibleType.name;
        }
      }
    }

    // Thrift struct-success unions stamp boolean `field0` (presence of result field
    // id 0). When no GraphQL member declares `field0`, treat the stamp as
    // authoritative — leftover `message: undefined` must not beat success via scoring.
    // Require `__throw_*` keys so ordinary REST payloads with a boolean `field0`
    // keep normal member scoring (do not skip `value`/`ok` members on field0:false).
    const anyDeclaresField0 =
      data != null && typeof data === 'object'
        ? possibleTypes.some(t => 'field0' in t.getFields())
        : false;
    const hasThrowStamps =
      data != null &&
      typeof data === 'object' &&
      Object.keys(data).some(k => typeof k === 'string' && k.startsWith('__throw_'));
    const thriftField0Stamp =
      data != null &&
      typeof data === 'object' &&
      typeof data.field0 === 'boolean' &&
      !anyDeclaresField0 &&
      hasThrowStamps;
    if (thriftField0Stamp && data.field0 === true) {
      const success = possibleTypes.find(t => {
        const fields = t.getFields();
        return 'value' in fields || 'ok' in fields;
      });
      if (success) {
        return success.name;
      }
    }

    const dataTypeOf = typeof data;

    if (dataTypeOf !== 'object') {
      // Scalar/container members (ex-`@resolveRoot`): prefer Connectors `field: $` root
      // aliases so permissive scalars (JSON/ObjMap) on non-alias members cannot win first.
      const tryParseMember = (requireRootAlias: boolean) => {
        for (const possibleType of possibleTypes) {
          const fields = Object.values(possibleType.getFields());
          if (fields.length !== 1) continue;
          const field = fields[0];
          // Prefer shared reader so composed `@join__directive(name: "connect")` still works.
          const connectSel = getConnectArgsFromNode(field)[0]?.selection;
          const isRootAlias =
            typeof connectSel === 'string' &&
            (connectSel.trim() === '$' || connectSel.trim() === `${field.name}: $`);
          if (requireRootAlias && !isRootAlias) continue;
          if (!requireRootAlias && isRootAlias) continue;
          const fieldType = getNullableType(field.type);
          if (fieldType && 'parseValue' in fieldType) {
            try {
              fieldType.parseValue(data);
              return possibleType.name;
            } catch (e) {}
          }
        }
        return undefined;
      };
      const fromRootAlias = tryParseMember(true);
      if (fromRootAlias) return fromRootAlias;
      const fromOther = tryParseMember(false);
      if (fromOther) return fromOther;
    }

    // const validationErrors: Record<string, ErrorObject[]> = {};
    // Thrift union stamps use `field0` as metadata; keep it only when a candidate
    // GraphQL member actually declares a `field0` field (ordinary REST unions).
    const dataKeys = dataTypeOf
      ? Object.keys(data)
          // Remove metadata fields used to pass data / Thrift union discriminators
          .filter(property => {
            const key = property.toString();
            if (key.startsWith('$') || key.startsWith('__throw_')) return false;
            if (key === 'field0' && !anyDeclaresField0) return false;
            return true;
          })
      : null;
    const scoreTypeNameMap = new Map<number, string>();
    for (const possibleType of possibleTypes) {
      // When Thrift stamped field0:false, do not let empty success `value`/`ok`
      // keys win scoring against exception members.
      if (thriftField0Stamp && data.field0 === false) {
        const fields = possibleType.getFields();
        if (('value' in fields || 'ok' in fields) && !('message' in fields)) {
          continue;
        }
      }
      const typeName = possibleType.name;
      if (dataKeys != null) {
        const typeFields = Object.keys(possibleType.getFields());
        if (
          dataKeys.length <= typeFields.length &&
          dataKeys.every(property => typeFields.includes(property.toString()))
        ) {
          return typeName;
        } else {
          const score = dataKeys.filter(property =>
            typeFields.includes(property.toString()),
          ).length;
          if (score || typeFields.includes('additionalProperties')) {
            scoreTypeNameMap.set(score, typeName);
          }
        }
      } /* else {
        const validateFn = possibleType.extensions.validateWithJSONSchema as ValidateFunction;
        if (validateFn) {
          const isValid = validateFn(data);
          if (isValid) {
            return typeName;
          }
          validationErrors[typeName] = ajv.errors || validateFn.errors;
        }
      } */
    }
    const maxScore = Math.max(...scoreTypeNameMap.keys());
    const typeName = scoreTypeNameMap.get(maxScore);
    if (typeName) {
      return typeName;
    }
    if (data.$response) {
      const error = new GraphQLError(`Upstream HTTP Error: ${data.$statusCode}`, {
        extensions: {
          code: 'CONNECTOR_FETCH',
          serviceName,
          request: {
            url: data.$url,
            method: data.$method,
          },
          response: {
            status: data.$statusCode,
            statusText: data.$statusText,
            headers: data.$response.header,
            body: data.$response,
          },
        },
      });
      return error;
    }
    /*
    const error = new GraphQLError(`Received data doesn't met the union`, null, null, null, null, null, {
      validationErrors,
    });
    return error;
    */
  };
}
