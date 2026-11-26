import {
  GraphQLObjectType,
  GraphQLSchema,
  isObjectType,
  Kind,
  OperationTypeNode,
  visit,
  visitWithTypeInfo,
} from 'graphql';
import { getTypeInfo, type DelegationContext, type Transform } from '@graphql-tools/delegate';
import {
  getDefinedRootType,
  getRootTypeMap,
  MapperKind,
  mapSchema,
  type ExecutionRequest,
  type ExecutionResult,
} from '@graphql-tools/utils';

const defaultRootTypeNames = {
  query: 'Query',
  mutation: 'Mutation',
  subscription: 'Subscription',
};

interface MoveRootFieldTransformationContext {
  newOperationType?: OperationTypeNode;
  wrappingOperationType?: OperationTypeNode;
}

export class MoveRootField implements Transform<MoveRootFieldTransformationContext> {
  private to: Record<OperationTypeNode, Record<string, OperationTypeNode>> = {
    query: {},
    mutation: {},
    subscription: {},
  };

  private transformedSchema: GraphQLSchema | undefined;
  constructor(private from: Record<OperationTypeNode, Record<string, OperationTypeNode>>) {
    for (const operation in this.from) {
      const removedFields = this.from[operation as OperationTypeNode];
      for (const fieldName in removedFields) {
        const newOperation = removedFields[fieldName];
        this.to[newOperation as OperationTypeNode][fieldName] = operation as OperationTypeNode;
      }
    }
  }

  public transformSchema(
    schema: GraphQLSchema,
    _subschemaConfig: Record<string, any>,
  ): GraphQLSchema {
    const rootTypeMap = getRootTypeMap(schema);
    // fields come from toConfig, so use its type which is normalized in graphql 17
    const newRootFieldsMap: Record<
      OperationTypeNode,
      ReturnType<GraphQLObjectType['toConfig']>['fields']
    > = {
      query: rootTypeMap.get('query' as OperationTypeNode)?.toConfig()?.fields || {},
      mutation: rootTypeMap.get('mutation' as OperationTypeNode)?.toConfig()?.fields || {},
      subscription: rootTypeMap.get('subscription' as OperationTypeNode)?.toConfig()?.fields || {},
    };

    // Snapshot every moved field before mutating either root-field map so swaps
    // preserve each field's original configuration.
    const moves: Array<{
      sourceOperation: OperationTypeNode;
      fieldName: string;
      destOperation: OperationTypeNode;
      fieldConfig: (typeof newRootFieldsMap)[OperationTypeNode][string];
    }> = [];

    for (const operation in this.from) {
      const removedFields = this.from[operation as OperationTypeNode];
      for (const fieldName in removedFields) {
        const sourceOperation = operation as OperationTypeNode;
        moves.push({
          sourceOperation,
          fieldName,
          destOperation: removedFields[fieldName]!,
          fieldConfig: newRootFieldsMap[sourceOperation][fieldName]!,
        });
      }
    }

    for (const move of moves) {
      delete newRootFieldsMap[move.sourceOperation]?.[move.fieldName];
    }
    for (const move of moves) {
      newRootFieldsMap[move.destOperation][move.fieldName] = move.fieldConfig;
    }

    const schemaConfig = schema.toConfig();
    for (const rootType in newRootFieldsMap) {
      const newRootFields = newRootFieldsMap[rootType as OperationTypeNode];
      if (!schemaConfig[rootType as OperationTypeNode] && Object.keys(newRootFields).length > 0) {
        schemaConfig[rootType as OperationTypeNode] = new GraphQLObjectType({
          name: defaultRootTypeNames[rootType as OperationTypeNode],
          fields: newRootFields,
        });
      }
    }
    this.transformedSchema = mapSchema(new GraphQLSchema(schemaConfig), {
      [MapperKind.QUERY]: type => {
        const queryConfig = type.toConfig();
        queryConfig.fields = newRootFieldsMap.query;
        return new GraphQLObjectType(queryConfig);
      },
      [MapperKind.MUTATION]: type => {
        const mutationConfig = type.toConfig();
        mutationConfig.fields = newRootFieldsMap.mutation;
        return new GraphQLObjectType(mutationConfig);
      },
      [MapperKind.SUBSCRIPTION]: type => {
        const subscriptionConfig = type.toConfig();
        subscriptionConfig.fields = newRootFieldsMap.subscription;
        return new GraphQLObjectType(subscriptionConfig);
      },
    });
    return this.transformedSchema;
  }

  public transformRequest(
    originalRequest: ExecutionRequest,
    _delegationContext: DelegationContext,
    transformationContext: MoveRootFieldTransformationContext,
  ): ExecutionRequest {
    const sourceOperationType = originalRequest.operationType || OperationTypeNode.QUERY;
    // The wrapping (client-facing) operation must be preserved for result
    // __typename rewriting even after the request is rewritten to the source op.
    transformationContext.wrappingOperationType = sourceOperationType;
    if (this.transformedSchema) {
      const typeInfo = getTypeInfo(this.transformedSchema);
      const rootTypes = getRootTypeMap(this.transformedSchema);
      const reversedRootTypeMap = new Map<GraphQLObjectType, OperationTypeNode>();
      for (const [opType, type] of rootTypes.entries()) {
        reversedRootTypeMap.set(type, opType);
      }
      return {
        ...originalRequest,
        document: visit(
          originalRequest.document,
          visitWithTypeInfo(typeInfo, {
            [Kind.FIELD]: {
              enter: node => {
                const parentType = typeInfo.getParentType();
                if (isObjectType(parentType)) {
                  const parentOperation = reversedRootTypeMap.get(parentType);
                  if (
                    parentOperation != null &&
                    this.to[parentOperation][node.name.value] != null
                  ) {
                    transformationContext.newOperationType =
                      this.to[parentOperation][node.name.value];
                  }
                }
              },
            },
            [Kind.OPERATION_DEFINITION]: {
              leave: node => {
                if (
                  transformationContext.newOperationType &&
                  transformationContext.newOperationType !== sourceOperationType
                ) {
                  return {
                    ...node,
                    operation: transformationContext.newOperationType,
                  };
                }
                return node;
              },
            },
          }),
        ),
      };
    }
    return originalRequest;
  }

  public transformResult(
    result: ExecutionResult,
    _delegationContext: DelegationContext,
    transformationContext: MoveRootFieldTransformationContext,
  ) {
    const wrappingOperation =
      transformationContext.wrappingOperationType ?? transformationContext.newOperationType;
    if (this.transformedSchema && result.data?.__typename && wrappingOperation) {
      const rootType = getDefinedRootType(this.transformedSchema, wrappingOperation);
      if (rootType) {
        result.data.__typename = rootType.name;
      }
    }
    return result;
  }
}
