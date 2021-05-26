import { Interpolator } from '@ardatan/string-interpolation';
import { format } from 'date-fns';
import { hashObject } from './hashObject';

export const stringInterpolator = new Interpolator({
  delimiter: ['{', '}'],
});

stringInterpolator.addAlias('typeName', 'info.parentType.name');
stringInterpolator.addAlias('type', 'info.parentType.name');
stringInterpolator.addAlias('parentType', 'info.parentType.name');
stringInterpolator.addAlias('fieldName', 'info.fieldName');
stringInterpolator.registerModifier('date', (formatStr: string) => format(new Date(), formatStr));
stringInterpolator.registerModifier('hash', (value: any) => hashObject(value));
