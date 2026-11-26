import { setOwnProp } from '../src/isPrototypePollutingKey.js';

describe('setOwnProp', () => {
  it('preserves constructor and prototype as own response keys', () => {
    const obj: Record<string, any> = Object.create(null);
    setOwnProp(obj, 'constructor', 'ctor-value');
    setOwnProp(obj, 'prototype', 'proto-value');
    expect(Object.prototype.hasOwnProperty.call(obj, 'constructor')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(obj, 'prototype')).toBe(true);
    expect(obj.constructor).toBe('ctor-value');
    expect(obj.prototype).toBe('proto-value');
  });

  it('rejects __proto__ writes', () => {
    const obj: Record<string, any> = {};
    setOwnProp(obj, '__proto__', { polluted: true });
    expect(({} as any).polluted).toBeUndefined();
  });
});
