import type { GraphQLField } from 'graphql';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';

import { getResolverForPubSubOperation } from '@graphql-mesh/utils';
import { Logger } from '@graphql-hive/logger';
import type { PubSub } from '@graphql-hive/pubsub';

interface ProcessPubSubOperationAnnotationsOpts {
  field: GraphQLField<any, any>;
  globalPubsub: PubSub;
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
