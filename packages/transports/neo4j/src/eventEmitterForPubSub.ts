// eslint-disable-next-line import/no-nodejs-modules
import type { EventEmitter } from 'events';
import type { PubSub } from '@graphql-hive/pubsub';
import { fakePromise } from '@whatwg-node/promise-helpers';

export function getEventEmitterFromPubSub(pubsub: PubSub) {
  return {
    on(event: string | symbol, listener: (...args: any[]) => void) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fakePromise(pubsub.subscribe(event.toString(), listener));
      return this;
    },
    once(event: string | symbol, listener: (...args: any[]) => void) {
      let called = false;
      const unsubPromise = fakePromise(
        pubsub.subscribe(event.toString(), data => {
          if (called) {
            return;
          }
          called = true;
          listener(data);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          unsubPromise.then(unsub => unsub());
        }),
      );

      return this;
    },
    emit(event: string | symbol, ...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      pubsub.publish(event.toString(), args[0]);
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
