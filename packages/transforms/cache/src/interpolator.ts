import { Interpolator } from '@ardatan/string-interpolation';
import { format } from 'date-fns';
import objectHash from 'object-hash';

const interpolator = new Interpolator({
  delimiter: ['{', '}'],
});
interpolator.addAlias('typeName', 'info.parentType.name');
interpolator.addAlias('type', 'info.parentType.name');
interpolator.addAlias('parentType', 'info.parentType.name');
interpolator.addAlias('fieldName', 'info.fieldName');
interpolator.registerModifier('date', (formatStr: string) => format(new Date(), formatStr));
interpolator.registerModifier('hash', (value: any) => objectHash(value, { ignoreUnknown: true }));

export { interpolator };
