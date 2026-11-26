import { copyJson } from '../src/copyJson.js';

describe('copyJson', () => {
  it('deep copies plain objects and arrays without sharing references', () => {
    const value = { node: { value: 'original', list: [1, { n: 2 }] } };
    const copy = copyJson(value);
    expect(copy).toEqual(value);
    expect(copy).not.toBe(value);
    expect(copy.node).not.toBe(value.node);
    expect(copy.node.list).not.toBe(value.node.list);
    expect(copy.node.list[1]).not.toBe(value.node.list[1]);
    copy.node.value = 'changed';
    copy.node.list.push(3);
    (copy.node.list[1] as { n: number }).n = 9;
    expect(value).toEqual({ node: { value: 'original', list: [1, { n: 2 }] } });
  });

  it('keeps an own __proto__ key as data instead of changing the prototype', () => {
    const value = JSON.parse('{"node":{"__proto__":{"polluted":true},"value":"original"}}');
    const copy = copyJson(value);
    expect(Object.getPrototypeOf(copy.node)).toBe(Object.prototype);
    expect(Object.hasOwn(copy.node, '__proto__')).toBe(true);
    expect((copy.node as { polluted?: boolean }).polluted).toBeUndefined();
    expect(copy.node.value).toBe('original');
  });

  it('returns primitives unchanged', () => {
    expect(copyJson(null)).toBe(null);
    expect(copyJson(1)).toBe(1);
    expect(copyJson('x')).toBe('x');
    expect(copyJson(true)).toBe(true);
  });
});
