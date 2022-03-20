import { HookName, AllHooks, MeshPubSub } from '@graphql-mesh/types';
import { observableToAsyncIterable } from '@graphql-tools/utils';

class PubSubEvent<THook extends HookName> extends Event {
  detail: AllHooks[THook];
  constructor(type: string, eventInitDict?: CustomEventInit<any>) {
    super(type, eventInitDict);
    this.detail = eventInitDict?.detail;
  }
}

export class PubSub implements MeshPubSub {
  private eventTarget: EventTarget;
  constructor(eventTarget?: EventTarget) {
    if (eventTarget) {
      this.eventTarget = eventTarget;
    } else {
      this.eventTarget = new EventTarget();
    }
  }

  publish<THook extends HookName>(triggerName: THook, detail: AllHooks[THook]): void {
    this.eventTarget.dispatchEvent(new PubSubEvent(triggerName, { detail }));
  }

  private listenerIdMap = new Map<
    number,
    {
      triggerName: HookName;
      eventListener: EventListener;
    }
  >();

  subscribe<THook extends HookName>(triggerName: THook, onMessage: (data: AllHooks[THook]) => void): number {
    function eventListener(event: PubSubEvent<THook>) {
      onMessage(event.detail);
    }
    this.eventTarget.addEventListener(triggerName, eventListener);
    const subId = this.listenerIdMap.size;
    this.listenerIdMap.set(subId, { triggerName, eventListener });
    return subId;
  }

  unsubscribe(subId: number): void {
    const listenerObj = this.listenerIdMap.get(subId);
    if (listenerObj) {
      this.eventTarget.removeEventListener(listenerObj.triggerName, listenerObj.eventListener);
      this.listenerIdMap.delete(subId);
    }
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
