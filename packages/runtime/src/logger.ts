import { Logger } from '@graphql-mesh/types';
import { env } from 'process';

export class DefaultLogger implements Logger {
  constructor(public name: string) {}
  log(message: string) {
    return console.log(this.name + ':' + message);
  }

  warn(message: string) {
    return this.log(message);
  }

  info(message: string) {
    return this.log(message);
  }

  error(message: string) {
    return this.log(message);
  }

  debug(message: string) {
    if (env.DEBUG) {
      return this.log(message);
    }
  }

  child(name: string): Logger {
    return new DefaultLogger(this.name + ' ' + name);
  }
}
