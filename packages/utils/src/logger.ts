import { Logger } from '@graphql-mesh/types';
import { env } from 'process';
import chalk from 'chalk';

const warnColor = chalk.keyword(`orange`);
const infoColor = chalk.cyan;
const errorColor = chalk.red;
const debugColor = chalk.magenta;
const titleBold = chalk.bold;

export class DefaultLogger implements Logger {
  constructor(public name?: string) {}
  log(message: string) {
    const finalMessage = this.name ? `${titleBold(this.name)}: ${message}` : message;
    return console.log(finalMessage);
  }

  warn(message: string) {
    return this.log(warnColor(message));
  }

  info(message: string) {
    return this.log(infoColor(message));
  }

  error(message: string) {
    return this.log(errorColor(message));
  }

  debug(message: string) {
    if ((env.DEBUG && env.DEBUG === '1') || this.name.includes(env.DEBUG)) {
      return this.log(debugColor(message));
    }
  }

  child(name: string): Logger {
    return new DefaultLogger(this.name ? `${this.name} - ${name}` : name);
  }
}
