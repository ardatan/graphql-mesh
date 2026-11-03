import type { GraphQLField } from 'graphql';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { toMeshPubSub, type HivePubSub, type MeshPubSub } from '@graphql-mesh/types';
import { getResolverForPubSubOperation } from '@graphql-mesh/utils';
import { Logger } from '@graphql-hive/logger';

interface ProcessPubSubOperationAnnotationsOpts {
  field: GraphQLField<any, any>;
  globalPubsub: MeshPubSub | HivePubSub;
  pubsubTopic: string;
  log: Logger;
}

export function processPubSubOperationAnnotations({
  field,
  globalPubsub,
  pubsubTopic, log: globalLogger,
}: ProcessPubSubOperationAnnotationsOpts) {
  const { subscribe, resolve } = getResolverForPubSubOperation({
    pubsubTopic,
    pubsub: globalPubsub,
  });
  field.subscribe = subscribe;
  field.resolve = resolve;
  return field;
}
