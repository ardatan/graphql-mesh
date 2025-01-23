import { AsyncDisposableStack } from '@whatwg-node/disposablestack';

const terminateEvents = ['SIGINT', 'SIGTERM'] as const;

export type TerminateEvents = (typeof terminateEvents)[number];
export type TerminateHandler = (eventName: TerminateEvents) => void;

let eventListenerRegistered = false;

const terminateHandlers = new Set<TerminateHandler>();

function registerEventListener() {
  for (const eventName of terminateEvents) {
    globalThis.process?.once(eventName, () => {
      for (const handler of terminateHandlers) {
        handler(eventName);
        terminateHandlers.delete(handler);
      }
    });
  }
}

export function registerTerminateHandler(callback: TerminateHandler) {
  if (!eventListenerRegistered) {
    registerEventListener();
    eventListenerRegistered = true;
  }
  terminateHandlers.add(callback);
  return () => {
    terminateHandlers.delete(callback);
  };
}

let terminateStack: AsyncDisposableStack;

export function getTerminateStack() {
  if (!terminateStack) {
    terminateStack = new AsyncDisposableStack();
    registerTerminateHandler(() => terminateStack.disposeAsync());
  }
  return terminateStack;
}
