import { HookName, AllHooks } from '@graphql-mesh/types';
import { observableToAsyncIterable } from '@graphql-tools/utils';

class PubSubEvent<THook extends HookName> extends Event implements CustomEvent<AllHooks[THook]> {
  detail: AllHooks[THook];
  constructor(type: string, eventInitDict?: CustomEventInit<any>) {
    super(type, eventInitDict);
    this.detail = eventInitDict?.detail;
  }

  initCustomEvent(type: string, bubbles?: boolean, cancelable?: boolean, detail?: AllHooks[THook]): void {
    super.initEvent(type, bubbles, cancelable);
    this.detail = detail;
  }
}

export class PubSub {
  private eventTarget: EventTarget;
  constructor(eventTarget?: EventTarget) {
    if (eventTarget) {
      this.eventTarget = eventTarget;
    } else {
      this.eventTarget = new EventTarget();
    }
  }

  async publish<THook extends HookName>(triggerName: THook, payload: AllHooks[THook]): Promise<void> {
    this.eventTarget.dispatchEvent(new PubSubEvent(triggerName, { detail: payload }));
  }

  private listenerIdMap = new Map<
    number,
    {
      triggerName: HookName;
      onMessage: (data: AllHooks[HookName]) => void;
      eventListener: EventListener;
    }
  >();

  subscribe<THook extends HookName>(triggerName: THook, onMessage: (data: AllHooks[THook]) => void): Promise<number> {
    const eventListener = function eventListener(event: PubSubEvent<THook>) {
      onMessage(event.detail);
    };
    this.eventTarget.addEventListener(triggerName, eventListener);
    const subId = this.listenerIdMap.size;
    this.listenerIdMap.set(subId, { triggerName, onMessage, eventListener });
    return Promise.resolve(subId);
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
        const subId$ = this.subscribe(triggerName, data => observer.next(data));
        return {
          unsubscribe: () => subId$.then(subId => this.unsubscribe(subId)),
        };
      },
    });
  }
}
