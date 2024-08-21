// eslint-disable-next-line import/no-nodejs-modules
import type { EventEmitter } from 'events';
import type { MeshPubSub } from '@graphql-mesh/types';

export function getEventEmitterFromPubSub(pubsub: MeshPubSub) {
  return {
    on(event: string | symbol, listener: (...args: any[]) => void) {
      pubsub.subscribe(event.toString(), listener);
      return this;
    },
    once(event: string | symbol, listener: (...args: any[]) => void) {
      const id = pubsub.subscribe(event.toString(), data => {
        listener(data);
        pubsub.unsubscribe(id);
      });

      return this;
    },
    emit(event: string | symbol, ...args: any[]) {
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
