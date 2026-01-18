import { stringInterpolator } from '../src/index.js';

describe('parseInterpolationStrings', () => {
  it('interpolates falsy values', () => {
    const context = { boolean: false, number: 0, string: '' };
    const tmpl = 'false: {boolean}, 0: {number}, string: {string}';
    const result = stringInterpolator.parse(tmpl, context);
    expect(result).toBe('false: false, 0: 0, string: ');
  });

  it('returns object directly when entire string is a placeholder', () => {
    const context = { user: { name: 'John', age: 30 } };
    const result = stringInterpolator.parse('{user}', context);
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('returns array directly when entire string is a placeholder', () => {
    const context = { items: [1, 2, 3] };
    const result = stringInterpolator.parse('{items}', context);
    expect(result).toEqual([1, 2, 3]);
  });

  it('JSON stringifies object when embedded in a larger string', () => {
    const context = { user: { name: 'John' } };
    const result = stringInterpolator.parse('User: {user}', context);
    expect(result).toBe('User: {"name":"John"}');
  });

  it('JSON stringifies array when embedded in a larger string', () => {
    const context = { items: [1, 2, 3] };
    const result = stringInterpolator.parse('Items: {items}', context);
    expect(result).toBe('Items: [1,2,3]');
  });
  it('returns undefined when entire string is a placeholder for undefined', () => {
    const context = {};
    const result = stringInterpolator.parse('{missing}', context);
    expect(result).toBeUndefined();
  });
});
