// eslint-disable-next-line import/no-nodejs-modules
import type { EventEmitter } from 'events';
import type { HivePubSub } from '@graphql-mesh/types';

export function getEventEmitterFromPubSub(pubsub: HivePubSub) {
  return {
    on(event: string | symbol, listener: (...args: any[]) => void) {
      void Promise.resolve(pubsub.subscribe(event.toString(), listener));
      return this;
    },
    once(event: string | symbol, listener: (...args: any[]) => void) {
      const unsubPromise = Promise.resolve(
        pubsub.subscribe(event.toString(), data => {
          listener(data);
          void unsubPromise.then(unsub => unsub());
        }),
      );

      return this;
    },
    emit(event: string | symbol, ...args: any[]) {
      void pubsub.publish(event.toString(), args[0]);
      return true;
    },
    addListener(event: string | symbol, listener: (...args: any[]) => void) {
      return this.on(event, listener);
    },
    setMaxListeners() {
      return this;
    },
  } as any as EventEmitter;
}
