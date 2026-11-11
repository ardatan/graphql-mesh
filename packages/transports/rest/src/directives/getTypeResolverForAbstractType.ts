import {
  GraphQLError,
  isAbstractType,
  type GraphQLObjectType,
  type GraphQLResolveInfo,
  type GraphQLTypeResolver,
} from 'graphql';
import { getDirective } from '@graphql-tools/utils';

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
    } else if (discriminatorField != null && data[discriminatorField]) {
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

    const dataTypeOf = typeof data;

    if (dataTypeOf !== 'object') {
      // Scalar/container members (ex-`@resolveRoot`): single scalar field, or
      // Connectors `field: $` selection. Try parseValue to pick the member.
      for (const possibleType of possibleTypes) {
        const fields = Object.values(possibleType.getFields());
        if (fields.length !== 1) continue;
        const field = fields[0];
        const connectSel = getDirective(info.schema, field, 'connect')?.[0]?.selection;
        const isRootAlias =
          typeof connectSel === 'string' &&
          (connectSel.trim() === '$' || connectSel.trim() === `${field.name}: $`);
        const fieldType = field.type;
        if ((isRootAlias || 'parseValue' in fieldType) && fieldType && 'parseValue' in fieldType) {
          try {
            fieldType.parseValue(data);
            return possibleType.name;
          } catch (e) {}
        }
      }
    }

    // const validationErrors: Record<string, ErrorObject[]> = {};
    const dataKeys = dataTypeOf
      ? Object.keys(data)
          // Remove metadata fields used to pass data
          .filter(property => !property.toString().startsWith('$'))
      : null;
    const scoreTypeNameMap = new Map<number, string>();
    for (const possibleType of possibleTypes) {
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
          code: 'DOWNSTREAM_SERVICE_ERROR',
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
