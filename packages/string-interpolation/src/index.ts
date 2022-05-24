import { Interpolator } from './interpolator';
import dayjs from 'dayjs';
import objectHash from 'object-hash';

export function hashObject(value: any): string {
  return objectHash(value, { ignoreUnknown: true }).toString();
}

export { Interpolator };

export const stringInterpolator = new Interpolator({
  delimiter: ['{', '}'],
});

stringInterpolator.addAlias('typeName', 'info.parentType.name');
stringInterpolator.addAlias('type', 'info.parentType.name');
stringInterpolator.addAlias('parentType', 'info.parentType.name');
stringInterpolator.addAlias('fieldName', 'info.fieldName');
stringInterpolator.registerModifier('date', (formatStr: string) => dayjs(new Date()).format(formatStr));
stringInterpolator.registerModifier('hash', (value: any) => hashObject(value));
stringInterpolator.registerModifier('base64', (value: any) => {
  if (globalThis.Buffer.from) {
    return globalThis.Buffer.from(value).toString('base64');
  } else {
    return btoa(value);
  }
});

export * from './resolver-data-factory';
