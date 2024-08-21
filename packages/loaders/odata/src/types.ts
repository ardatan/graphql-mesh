// eslint-disable-next-line import/no-nodejs-modules
import type EventEmitter from 'node:events';
import type { DirectiveArgsMap } from './directives';

export interface EntityTypeExtensions {
  directives: DirectiveArgsMap;
  eventEmitter: EventEmitter;
}
