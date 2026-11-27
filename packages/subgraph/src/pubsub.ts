import { defaultFieldResolver, type GraphQLFieldConfig, type GraphQLSchema } from 'graphql';
import type { PubSub } from '@graphql-hive/pubsub';
import { getResolverForPubSubOperation } from '@graphql-mesh/utils';
import { getDirectiveExtensions, MapperKind, mapSchema } from '@graphql-tools/utils';
import { handleMaybePromise, isPromise } from '@whatwg-node/promise-helpers';

interface PubSubDirectiveArgs {
  pubsubTopic: string;
  filterBy?: string;
  result?: string;
}

/**
 * Wire Mesh `@pubsubOperation` / `@pubsubPublish` when a `pubsub` instance is
 * provided. When `pubsub` is absent, returns the schema unchanged (clear
 * no-op — those directives do not install subscribe/publish side effects).
 */
export function wirePubSubDirectives(
  schema: GraphQLSchema,
  pubsub: PubSub | undefined,
): GraphQLSchema {
  if (!pubsub) {
    return schema;
  }

  const hasOperation = schema.getDirective('pubsubOperation') != null;
  const hasPublish = schema.getDirective('pubsubPublish') != null;
  if (!hasOperation && !hasPublish) {
    // Still scan field extensions — directives may be imported without a local def
    // after `@link` / compose. Cheap presence check via one mapSchema pass below.
  }

  return mapSchema(schema, {
    [MapperKind.ROOT_FIELD](fieldConfig, _fieldName, _typeName, mappedSchema) {
      return wireFieldPubSub(fieldConfig, mappedSchema, pubsub);
    },
    [MapperKind.OBJECT_FIELD](fieldConfig, _fieldName, _typeName, mappedSchema) {
      return wireFieldPubSub(fieldConfig, mappedSchema, pubsub);
    },
  });
}

function wireFieldPubSub(
  fieldConfig: GraphQLFieldConfig<any, any>,
  schema: GraphQLSchema,
  pubsub: PubSub,
): GraphQLFieldConfig<any, any> {
  const dirs = getDirectiveExtensions<{
    pubsubOperation: PubSubDirectiveArgs;
    pubsubPublish: PubSubDirectiveArgs;
  }>(fieldConfig, schema);

  let next = fieldConfig;

  if (dirs.pubsubOperation?.length) {
    // Last wins when repeatable; matches fusion runtime Object.assign loop.
    let subscribe: ReturnType<typeof getResolverForPubSubOperation>['subscribe'] | undefined;
    let resolve: ReturnType<typeof getResolverForPubSubOperation>['resolve'] | undefined;
    for (const args of dirs.pubsubOperation) {
      const resolver = getResolverForPubSubOperation({
        pubsubTopic: args.pubsubTopic,
        filterBy: args.filterBy,
        result: args.result,
        pubsub,
      });
      subscribe = resolver.subscribe;
      resolve = resolver.resolve;
    }
    next = {
      ...next,
      subscribe,
      resolve: resolve || next.resolve,
    };
  }

  if (dirs.pubsubPublish?.length) {
    const originalResolve = next.resolve || defaultFieldResolver;
    const publishArgs = dirs.pubsubPublish;
    next = {
      ...next,
      resolve(root, args, context, info) {
        return handleMaybePromise(
          () => originalResolve(root, args, context, info),
          payload => {
            const jobs: Promise<void>[] = [];
            for (const pub of publishArgs) {
              const job = pubsub.publish(pub.pubsubTopic, payload);
              if (isPromise(job)) {
                jobs.push(job);
              }
            }
            if (jobs.length) {
              return Promise.all(jobs).then(() => payload);
            }
            return payload;
          },
        );
      },
    };
  }

  return next;
}
