import {
  getVariableValues as coerceOperationVariables,
  getArgumentValues,
  getNamedType,
  GraphQLError,
  isNonNullType,
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
  type GraphQLField,
  type GraphQLSchema,
} from 'graphql';
import {
  delegateToSchema,
  getVariableValues,
  isSubschemaConfig,
  type StitchingInfo,
} from '@graphql-tools/delegate';
import { getFragmentsFromDocument } from '@graphql-tools/executor';
import {
  collectFields,
  getDefinedRootType,
  getOperationASTFromRequest,
  getRootTypeMap,
  type ExecutionRequest,
} from '@graphql-tools/utils';
import { asGetArgumentValuesVariables } from './variableValues.js';

/**
 * Creates an executor that uses the schema created by stitching together multiple subschemas.
 * Not ready for production
 * Breaking changes can be introduced in the meanwhile
 *
 * @experimental
 *
 */
export function createStitchingExecutor(stitchedSchema: GraphQLSchema) {
  const subschemas = [
    ...(stitchedSchema.extensions?.stitchingInfo as StitchingInfo).subschemaMap.values(),
  ];
  return async function stitchingExecutor(executorRequest: ExecutionRequest) {
    const fragments = getFragmentsFromDocument(executorRequest.document);
    const operation = getOperationASTFromRequest(executorRequest);
    const rootType = getDefinedRootType(stitchedSchema, operation.operation);

    // Coerce variables against the operation before collectFields / getArgumentValues
    // so defaults apply and invalid values fail early.
    const coerced = coerceOperationVariables(
      stitchedSchema,
      operation.variableDefinitions ?? [],
      executorRequest.variables ?? {},
      { maxErrors: 50 },
    );
    if (coerced.errors != null) {
      return { data: null, errors: [...coerced.errors] };
    }
    // graphql 16: `{ coerced }`; graphql 17: `{ variableValues: { coerced, sources } }`
    const coercedAny = coerced as {
      coerced?: Record<string, unknown>;
      variableValues?: { coerced: Record<string, unknown> };
    };
    const coercedVariables = (
      coercedAny.variableValues != null ? coercedAny.variableValues.coerced : coercedAny.coerced
    ) as Record<string, unknown>;

    const { fields } = collectFields(
      stitchedSchema,
      fragments,
      getVariableValues(coercedVariables),
      rootType,
      operation.selectionSet,
    );
    // graphql 17 expects variables as `{ coerced, sources }` instead of a flat map
    const variableValues = asGetArgumentValuesVariables(coercedVariables)!;
    const data: Record<string, any> = {};
    const errors: GraphQLError[] = [];
    for (const [responseKey, fieldNodes] of fields) {
      const fieldNode = fieldNodes[0];
      if (!fieldNode) {
        continue;
      }
      // collectFields keys by response name (alias); schema lookup uses the field name
      const schemaFieldName = fieldNode.name.value;
      const fieldInstance =
        rootType.getFields()[schemaFieldName] ??
        resolveRootMetaFieldDef(schemaFieldName, operation.operation);
      if (!fieldInstance) {
        continue;
      }
      const isMetaField =
        schemaFieldName === '__typename' ||
        schemaFieldName === '__schema' ||
        schemaFieldName === '__type';
      const subschemaForField = isMetaField
        ? undefined
        : subschemas.find(subschema => {
            const subschemaSchema = isSubschemaConfig(subschema)
              ? subschema.schema
              : (subschema as GraphQLSchema);
            const subRootType = getRootTypeMap(subschemaSchema).get(operation.operation);
            if (subRootType == null) {
              return false;
            }
            return subRootType.getFields()[schemaFieldName] != null;
          });
      const args = getArgumentValues(fieldInstance, fieldNode, variableValues);
      const info = {
        schema: stitchedSchema,
        fieldName: schemaFieldName,
        fieldNodes,
        operation,
        fragments,
        parentType: rootType,
        returnType: fieldInstance.type,
        variableValues,
        rootValue: executorRequest.rootValue,
        path: { typename: undefined, key: responseKey, prev: undefined },
        getAbortSignal: () => executorRequest.signal,
        getAsyncHelpers: () => ({
          promiseAll: Promise.all.bind(Promise),
          track: () => undefined,
        }),
      };

      let result: unknown;
      if (isMetaField && typeof fieldInstance.resolve === 'function') {
        result = await fieldInstance.resolve(
          executorRequest.rootValue,
          args,
          executorRequest.context,
          info as any,
        );
      } else {
        result = await delegateToSchema({
          schema: subschemaForField || stitchedSchema,
          rootValue: executorRequest.rootValue,
          args,
          context: executorRequest.context,
          info,
        });
      }
      if (Array.isArray(result)) {
        result = await Promise.all(result);
      }
      const completed = completeDelegatedRootValue(result, fieldInstance, responseKey);
      if (completed.errors) {
        errors.push(...completed.errors);
      }
      if (completed.nullRoot) {
        return {
          data: null,
          errors: errors.length ? errors : completed.errors,
        };
      }
      data[responseKey] = completed.value;
    }
    return errors.length ? { data, errors } : { data };
  };
}

function resolveRootMetaFieldDef(
  fieldName: string,
  operation: string,
): GraphQLField<unknown, unknown> | undefined {
  if (fieldName === '__typename') {
    return TypeNameMetaFieldDef;
  }
  // Schema/type introspection is only valid on query roots
  if (operation !== 'query') {
    return undefined;
  }
  if (fieldName === '__schema') {
    return SchemaMetaFieldDef;
  }
  if (fieldName === '__type') {
    return TypeMetaFieldDef;
  }
  return undefined;
}

function completeDelegatedRootValue(
  result: unknown,
  fieldInstance: GraphQLField<unknown, unknown>,
  responseKey: string,
): { value: unknown; errors?: GraphQLError[]; nullRoot?: boolean } {
  if (result instanceof Error) {
    const error =
      result instanceof GraphQLError
        ? result
        : new GraphQLError(result.message, {
            originalError: result,
            path: [responseKey],
          });
    if (isNonNullType(fieldInstance.type)) {
      return { value: null, errors: [error], nullRoot: true };
    }
    return { value: null, errors: [error] };
  }
  if (result == null && isNonNullType(fieldInstance.type)) {
    const parentName = getNamedType(fieldInstance.type).name;
    const error = new GraphQLError(`Cannot return null for non-nullable field ${parentName}.`, {
      path: [responseKey],
    });
    return { value: null, errors: [error], nullRoot: true };
  }
  return { value: result };
}
