import type { AllHooks, HookName, MeshPubSub } from '@graphql-mesh/types';
import { observableToAsyncIterable } from '@graphql-tools/utils';

type Listener<THookName extends HookName = HookName> = (data: AllHooks[THookName]) => void;

export class PubSub implements MeshPubSub {
  private subIdListenerMap = new Map<number, Listener>();
  private listenerEventMap = new Map<Listener, HookName>();
  private eventNameListenersMap = new Map<HookName, Set<Listener<HookName>>>();

  getEventNames(): Iterable<string> {
    return this.eventNameListenersMap.keys();
  }

  publish<THook extends HookName>(triggerName: THook, detail: AllHooks[THook]): void {
    const eventNameListeners = this.eventNameListenersMap.get(triggerName);
    if (eventNameListeners) {
      Promise.allSettled([...eventNameListeners].map(listener => listener(detail))).catch(e =>
        console.error(e),
      );
    }
  }

  subscribe<THook extends HookName>(triggerName: THook, onMessage: Listener<string>): number {
    let eventNameListeners = this.eventNameListenersMap.get(triggerName);
    if (!eventNameListeners) {
      eventNameListeners = new Set();
      this.eventNameListenersMap.set(triggerName, eventNameListeners);
    }
    const subId = Date.now();
    eventNameListeners.add(onMessage);
    this.subIdListenerMap.set(subId, onMessage);
    this.listenerEventMap.set(onMessage, triggerName);
    return subId;
  }

  unsubscribe(subId: number): void {
    const listener = this.subIdListenerMap.get(subId);
    if (listener) {
      this.subIdListenerMap.delete(subId);
      const eventName = this.listenerEventMap.get(listener);
      if (eventName) {
        const eventNameListeners = this.eventNameListenersMap.get(eventName);
        if (eventNameListeners) {
          eventNameListeners.delete(listener);
        }
      }
    }
    this.listenerEventMap.delete(listener);
  }

  asyncIterator<THook extends HookName>(triggerName: THook): AsyncIterable<AllHooks[THook]> {
    return observableToAsyncIterable({
      subscribe: observer => {
        const subId = this.subscribe(triggerName, data => observer.next(data));
        return {
          unsubscribe: () => this.unsubscribe(subId),
        };
      },
    });
  }
}
