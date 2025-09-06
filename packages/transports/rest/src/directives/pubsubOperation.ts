import type { GraphQLField } from 'graphql';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { toMeshPubSub, type HivePubSub, type Logger, type MeshPubSub } from '@graphql-mesh/types';
import { getResolverForPubSubOperation } from '@graphql-mesh/utils';

interface ProcessPubSubOperationAnnotationsOpts {
  field: GraphQLField<any, any>;
  globalPubsub: MeshPubSub | HivePubSub;
  pubsubTopic: string;
  logger: Logger;
}

export function processPubSubOperationAnnotations({
  field,
  globalPubsub,
  pubsubTopic,
  logger: globalLogger,
}: ProcessPubSubOperationAnnotationsOpts) {
  const { subscribe, resolve } = getResolverForPubSubOperation({
    pubsubTopic,
    pubsub: globalPubsub,
  });
  field.subscribe = subscribe;
  field.resolve = resolve;
  return field;
}
