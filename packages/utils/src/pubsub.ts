import { HookName, AllHooks } from '@graphql-mesh/types';
import { inspect, withCancel } from '@graphql-tools/utils';
import { AbortController } from 'cross-undici-fetch';
import EventEmitter, { on } from 'events';

export class PubSub {
  private eventEmitter: EventEmitter;
  constructor(eventEmitter?: EventEmitter) {
    if (eventEmitter) {
      this.eventEmitter = eventEmitter;
    } else {
      this.eventEmitter = new EventEmitter({ captureRejections: true });
      this.eventEmitter.setMaxListeners(Infinity);
    }
  }

  async publish<THook extends HookName>(triggerName: THook, payload: AllHooks[THook]): Promise<void> {
    const isEmitted = this.eventEmitter.emit(triggerName, payload);
    if (!isEmitted) {
      throw new Error(`${triggerName} cannot emit ${inspect(payload)}`);
    }
  }

  private listenerIdMap = new Map<
    number,
    {
      triggerName: HookName;
      onMessage: (data: AllHooks[HookName]) => void;
    }
  >();

  subscribe<THook extends HookName>(triggerName: THook, onMessage: (data: AllHooks[THook]) => void): Promise<number> {
    this.eventEmitter.on(triggerName, onMessage);
    const subId = this.listenerIdMap.size;
    this.listenerIdMap.set(subId, { triggerName, onMessage });
    return Promise.resolve(subId);
  }

  unsubscribe(subId: number): void {
    const listenerObj = this.listenerIdMap.get(subId);
    if (listenerObj) {
      this.eventEmitter.off(listenerObj.triggerName, listenerObj.onMessage);
      this.listenerIdMap.delete(subId);
    }
  }

  asyncIterator<THook extends HookName>(triggerName: THook): AsyncIterable<AllHooks[THook]> {
    const abortController = new AbortController();
    return withCancel(
      on(this.eventEmitter, triggerName, {
        signal: abortController.signal,
      }),
      () => abortController.abort()
    );
  }
}
