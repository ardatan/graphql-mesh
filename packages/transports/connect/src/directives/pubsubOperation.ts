import type { GraphQLField } from 'graphql';
import type { PubSub } from '@graphql-hive/pubsub';
import { getResolverForPubSubOperation } from '@graphql-mesh/utils';

interface ProcessPubSubOperationAnnotationsOpts {
  field: GraphQLField<any, any>;
  globalPubsub: PubSub;
  pubsubTopic: string;
}

export function processPubSubOperationAnnotations({
  field,
  globalPubsub,
  pubsubTopic,
}: ProcessPubSubOperationAnnotationsOpts) {
  const { subscribe, resolve } = getResolverForPubSubOperation({
    pubsubTopic,
    pubsub: globalPubsub,
  });
  field.subscribe = subscribe;
  field.resolve = resolve;
  return field;
}
