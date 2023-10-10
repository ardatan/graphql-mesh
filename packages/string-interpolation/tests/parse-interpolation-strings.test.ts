import { stringInterpolator } from '../src/index.js';

describe('parseInterpolationStrings', () => {
  it('interpolates falsy values', () => {
    const context = { boolean: false, number: 0, string: '' };
    const tmpl = 'false: {boolean}, 0: {number}, string: {string}';
    const result = stringInterpolator.parse(tmpl, context);
    expect(result).toBe('false: false, 0: 0, string: ');
  });
});
