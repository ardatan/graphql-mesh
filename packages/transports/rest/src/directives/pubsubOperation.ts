import type { GraphQLField } from 'graphql';
import { stringInterpolator } from '@graphql-mesh/string-interpolation';
import { toMeshPubSub, type HivePubSub, type Logger, type MeshPubSub } from '@graphql-mesh/types';
import { createGraphQLError } from '@graphql-tools/utils';

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
  field.subscribe = function pubSubSubscribeFn(root, args, context, info) {
    const logger = context?.logger || globalLogger;
    const operationLogger = logger.child({ operation: `${info.parentType.name}.${field.name}` });
    const meshOrHivePubsub: MeshPubSub | HivePubSub = context?.pubsub || globalPubsub;
    if (!meshOrHivePubsub) {
      return new TypeError(`You should have PubSub defined in either the config or the context!`);
    }
    const pubsub = toMeshPubSub(meshOrHivePubsub);
    const interpolationData = { root, args, context, info, env: process.env };
    let interpolatedPubSubTopic: string = stringInterpolator.parse(pubsubTopic, interpolationData);
    if (interpolatedPubSubTopic.startsWith('webhook:')) {
      const [, expectedMethod, expectedUrl] = interpolatedPubSubTopic.split(':');
      const expectedPath = new URL(expectedUrl, 'http://localhost').pathname;
      interpolatedPubSubTopic = `webhook:${expectedMethod}:${expectedPath}`;
    }
    operationLogger.debug(
      `${info.parentType.name}.${field.name} => Subscribing to pubSubTopic: ${interpolatedPubSubTopic}`,
    );
    return pubsub.asyncIterator(interpolatedPubSubTopic);
  };
  field.resolve = function pubSubResolver(root, args, context, info) {
    const logger = context?.logger || globalLogger;
    const operationLogger = logger.child({ operation: `${info.parentType.name}.${field.name}` });
    operationLogger.debug('received', { root, pubsubTopic });
    return root;
  };
}
