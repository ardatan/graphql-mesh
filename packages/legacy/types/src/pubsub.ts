import type { PubSub as HivePubSub } from '@graphql-hive/pubsub';
import { isPromise, type MaybePromise } from '@graphql-tools/utils';
import { Repeater } from '@repeaterjs/repeater';
import { DisposableSymbols } from '@whatwg-node/disposablestack';

export type { HivePubSub };

export type AllHooks = {
  destroy: void;
  [key: string]: any;
};
export type HookName = keyof AllHooks & string;

export interface MeshPubSub {
  publish<THook extends HookName>(triggerName: THook, payload: AllHooks[THook]): void;
  subscribe<THook extends HookName>(
    triggerName: THook,
    onMessage: (data: AllHooks[THook]) => void,
    options?: any,
  ): number;
  unsubscribe(subId: number): void;
  getEventNames(): Iterable<string>;
  asyncIterator<THook extends HookName>(triggers: THook): AsyncIterable<AllHooks[THook]>;
}

/**
 * Converts the {@link PubSub Hive PubSub interface} to the legacy {@link MeshPubSub}
 * Please avoid using this class directly because it will be completely removed in
 * the future, instead migrate your project to use the {@link PubSub new interface}.
 *
 * @deprecated This class is deprecated and will be removed in the future. Implement and use the new {@link HivePubSub Hive PubSub interface} instead.
 */
export class MeshFromHivePubSub implements MeshPubSub {
  #pubsub: HivePubSub;
  #subs = new Map<
    number /** subId */,
    {
      triggerName: HookName;
      unsubscribe: MaybePromise<() => MaybePromise<void>>;
    }
  >();

  constructor(pubsub: HivePubSub) {
    this.#pubsub = pubsub;
  }

  static from(pubsub: undefined): undefined;
  static from(pubsub: HivePubSub): MeshFromHivePubSub;
  static from(pubsub: undefined | HivePubSub): undefined | MeshFromHivePubSub;
  static from(pubsub: undefined | HivePubSub): undefined | MeshFromHivePubSub {
    if (!pubsub) return undefined;
    return new MeshFromHivePubSub(pubsub);
  }

  publish<THook extends HookName>(triggerName: THook, payload: AllHooks[THook]): void {
    const publishing = this.#pubsub.publish(triggerName, payload);
    if (isPromise(publishing)) {
      publishing.catch(err => {
        console.error(`Failed to publish to ${triggerName}`, err);
      });
    }
  }

  subscribe<THook extends HookName>(
    triggerName: THook,
    onMessage: (data: AllHooks[THook]) => void,
  ): number {
    const subId = Math.floor(Math.random() * 100_000_000);
    const unsub = this.#pubsub.subscribe(triggerName, onMessage);
    this.#subs.set(subId, { triggerName, unsubscribe: unsub });
    if (isPromise(unsub)) {
      unsub.catch(err => {
        this.#subs.delete(subId);
        // TODO: what to do? is just logging ok?
        console.error(`Failed to subscribe to ${triggerName}`, err);
      });
    }
    return subId;
  }

  unsubscribe(subId: number): void {
    const { unsubscribe } = this.#subs.get(subId) || {};
    if (!unsubscribe) {
      return;
    }
    this.#subs.delete(subId);
    if (isPromise(unsubscribe)) {
      unsubscribe
        .then(unsub => {
          try {
            const unsubbed = unsub();
            if (isPromise(unsubbed)) {
              unsubbed.catch(err => {
                console.error(`Failed to finish unsubscribe from ${subId}`, err);
              });
            }
          } catch (err) {
            console.error(`Failed to finish unsubscribe from ${subId}`, err);
          }
        })
        .catch(err => {
          console.error(`Failed to start unsubscribe from ${subId}`, err);
        });
    } else {
      const unsubbed = unsubscribe();
      if (isPromise(unsubbed)) {
        unsubbed.catch(err => {
          console.error(`Failed to finish unsubscribe from ${subId}`, err);
        });
      }
    }
  }

  getEventNames(): Iterable<string> {
    // NOTE that the HivePubSub's subscriberTopics can be asynchronous
    // but we're not tracking that here because we cant
    return new Set(
      // get only distinct trigger names
      Array.from(this.#subs.values(), ({ triggerName }) => triggerName),
    );
  }

  asyncIterator<THook extends HookName>(triggerName: THook): AsyncIterable<AllHooks[THook]> {
    return new Repeater(async (push, stop) => {
      const subId = this.subscribe(triggerName, push);
      await stop;
      this.unsubscribe(subId);
    });
  }

  public dispose() {
    return this.#pubsub.dispose();
  }

  [DisposableSymbols.asyncDispose]() {
    return this.#pubsub.dispose();
  }
}

/**
 * Checks whether the provided {@link pubsub} is a {@link HivePubSub}. It is only
 * accurate when dealing with `@graphql-hive/pubsub` v2 and above.
 */
export function isHivePubSub(pubsub: undefined | MeshPubSub | HivePubSub): pubsub is HivePubSub {
  // HivePubSub does not have asyncIterator method. this only applies for @graphql-hive/pubsub v2+
  return pubsub != null && !('asyncIterator' in pubsub);
}

const meshForHibePubSub = new WeakMap<HivePubSub, MeshPubSub>();

/**
 * A utility function ensuring the provided {@link pubsub} is always the legacy {@link MeshPubSub}.
 * It does so by converting a {@link HivePubSub} to a {@link MeshPubSub} if provided, or leaving it
 * as is if it's already a {@link MeshPubSub}.
 *
 * Internally uses a WeakMap to cache the conversion for performance and to avoid creating too many
 * unnecessary instances if called multiple times.
 */
export function toMeshPubSub(pubsub: undefined): undefined;
export function toMeshPubSub(pubsub: MeshPubSub): MeshPubSub;
export function toMeshPubSub(pubsub: HivePubSub): MeshPubSub;
export function toMeshPubSub(pubsub: HivePubSub | MeshPubSub): MeshPubSub;
export function toMeshPubSub(pubsub: HivePubSub | MeshPubSub | undefined): MeshPubSub | undefined;
export function toMeshPubSub(pubsub?: MeshPubSub | HivePubSub | undefined): MeshPubSub | undefined {
  if (isHivePubSub(pubsub)) {
    let hivePubsub = meshForHibePubSub.get(pubsub);
    if (hivePubsub) {
      return hivePubsub;
    }
    hivePubsub = MeshFromHivePubSub.from(pubsub);
    meshForHibePubSub.set(pubsub, hivePubsub);
    return hivePubsub;
  }
  return pubsub;
}
