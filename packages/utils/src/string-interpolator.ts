import { Interpolator } from '@ardatan/string-interpolation';
import dayjs from 'dayjs';
import { hashObject } from './hashObject';

export const stringInterpolator = new Interpolator({
  delimiter: ['{', '}'],
});

stringInterpolator.addAlias('typeName', 'info.parentType.name');
stringInterpolator.addAlias('type', 'info.parentType.name');
stringInterpolator.addAlias('parentType', 'info.parentType.name');
stringInterpolator.addAlias('fieldName', 'info.fieldName');
stringInterpolator.registerModifier('date', (formatStr: string) => dayjs(new Date()).format(formatStr));
stringInterpolator.registerModifier('hash', (value: any) => hashObject(value));
stringInterpolator.registerModifier('base64', (value: any) => btoa(value));
