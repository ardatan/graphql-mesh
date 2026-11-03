import type { PubSub as HivePubSub } from '@graphql-hive/pubsub';

export type { HivePubSub };

export type AllHooks = {
  destroy: void;
  [key: string]: any;
};
export type HookName = keyof AllHooks & string;
