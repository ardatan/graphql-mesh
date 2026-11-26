import { compactGql } from './compactGql.js';

describe('compactGql', () => {
  it('preserves spaces inside string literals', () => {
    expect(compactGql('@d(value: "retry 2 times")')).toBe('@d(value:"retry 2 times")');
  });

  it('preserves leading spaces inside string literals', () => {
    expect(compactGql('@d(value: " hello")')).toBe('@d(value:" hello")');
  });

  it('preserves escaped quotes inside string literals', () => {
    expect(compactGql('{a: "say \\"hi\\" there" b: 1}')).toBe('{a:"say \\"hi\\" there",b:1}');
    expect(compactGql('{a: "x\\"y" b: 2}')).toBe('{a:"x\\"y",b:2}');
  });

  it('preserves embedded quotes inside block strings', () => {
    expect(compactGql('@d(value: """a" b "c""")')).toBe('@d(value:"""a" b "c""")');
    expect(compactGql('{a: """x" y "z""" b: 1}')).toBe('{a:"""x" y "z""",b:1}');
  });

  it('restores commas after closing quotes before the next field', () => {
    expect(compactGql('{foo: "bar" baz: 1}')).toBe('{foo:"bar",baz:1}');
    expect(compactGql('{a: "api" http: {GET: "/x"}}')).toBe('{a:"api",http:{GET:"/x"}}');
  });
});
