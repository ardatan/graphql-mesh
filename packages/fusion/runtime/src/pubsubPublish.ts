import { getNamedType, type GraphQLSchema, type SelectionSetNode } from 'graphql';
import {
  getDirectiveInExtensions,
  getOperationASTFromRequest,
  isAsyncIterable,
  memoize2,
  visitResult,
  type ExecutionRequest,
  type ExecutionResult,
  type Executor,
  type ResultVisitorMap,
  type ValueVisitor,
} from '@graphql-tools/utils';
import { handleMaybePromise } from '@whatwg-node/promise-helpers';

export interface PubsubPublishMetadata {
  pubsubTopic: string;
  entityInfo?: Record<string, SelectionSetNode>;
}

type PubSubLike = {
  publish: (topic: string, payload: unknown) => void | Promise<void>;
};

/**
 * Collect `@pubsubPublish` fields. Optional `entityResolutionMap` attaches
 * key selection sets (router query-plan path) for publish hydration.
 */
export function getPubsubPublishMetadata(
  schema: GraphQLSchema,
  entityResolutionMap: Map<string, Record<string, SelectionSetNode>> = new Map(),
) {
  const pubsubPublishMetadataMap: Map<string, Map<string, PubsubPublishMetadata>> = new Map();
  for (const typeName in schema.getTypeMap()) {
    const type = schema.getType(typeName);
    if (type == null || !('getFields' in type)) {
      continue;
    }
    const fields = type.getFields();
    for (const fieldName in fields) {
      const fieldDef = fields[fieldName];
      if (!fieldDef) {
        continue;
      }
      const pubsubPublishes = getDirectiveInExtensions(fieldDef, 'pubsubPublish');
      if (!pubsubPublishes) {
        continue;
      }
      for (const { pubsubTopic } of pubsubPublishes) {
        let typeMap = pubsubPublishMetadataMap.get(typeName);
        if (!typeMap) {
          typeMap = new Map<string, PubsubPublishMetadata>();
          pubsubPublishMetadataMap.set(typeName, typeMap);
        }
        const returnTypeName = getNamedType(fieldDef.type).name;
        const entityInfo = entityResolutionMap.get(returnTypeName);
        typeMap.set(fieldName, { pubsubTopic, entityInfo });
      }
    }
  }
  return pubsubPublishMetadataMap;
}

const getPubsubPublishVisitor = memoize2(function getPubsubPublishFields(
  metadata: Map<string, Map<string, PubsubPublishMetadata>>,
  pubsub: PubSubLike,
) {
  if (!metadata.size) {
    return false as const;
  }
  const pubsubPublishVisitor: ResultVisitorMap = {};
  for (const [typeName, fieldsMap] of metadata) {
    const typeVisitor = (pubsubPublishVisitor[typeName] ||= {}) as Record<string, ValueVisitor>;
    for (const [fieldName, { pubsubTopic }] of fieldsMap) {
      typeVisitor[fieldName] = value => {
        const maybePromise = pubsub.publish(pubsubTopic, value);
        if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
          (maybePromise as Promise<void>).catch(() => {
            // Swallow publish errors to avoid unhandled promise rejections.
          });
        }
        return value;
      };
    }
  }
  return pubsubPublishVisitor;
});

function isMutationRequest(request: ExecutionRequest): boolean {
  if (request.operationType === 'mutation') {
    return true;
  }
  return getOperationASTFromRequest(request)?.operation === 'mutation';
}

/**
 * Walk a Mutation result and fire `@pubsubPublish` (visitResult over annotated
 * fields). Used by fusion's executor wrap and router-runtime's plan path.
 */
export function handleResultWithPubSubPublish(
  schema: GraphQLSchema,
  metadata: Map<string, Map<string, PubsubPublishMetadata>>,
  request: ExecutionRequest,
  result: ExecutionResult,
) {
  const pubsub = (request.context as { pubsub?: PubSubLike } | undefined)?.pubsub;
  if (!isMutationRequest(request) || result.data == null || pubsub == null) {
    return result;
  }
  const pubsubPublishVisitor = getPubsubPublishVisitor(metadata, pubsub);
  if (pubsubPublishVisitor) {
    return visitResult(result, request, schema, pubsubPublishVisitor);
  }
  return result;
}

/**
 * Wrap a unified-graph executor so Mutation results fire `@pubsubPublish`.
 * No-op when the schema has no such directive.
 */
export function wrapExecutorWithPubsubPublish(schema: GraphQLSchema, executor: Executor): Executor {
  if (!schema.getDirective('pubsubPublish')) {
    return executor;
  }
  const metadata = getPubsubPublishMetadata(schema);
  return function pubsubPublishExecutor(request) {
    return handleMaybePromise(
      () => executor(request),
      result => {
        if (isAsyncIterable(result)) {
          return result;
        }
        return handleResultWithPubSubPublish(schema, metadata, request, result);
      },
    );
  };
}
