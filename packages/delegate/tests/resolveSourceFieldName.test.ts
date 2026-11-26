import { resolveSourceFieldName } from '../src/resolveSourceFieldName.js';

describe('resolveSourceFieldName', () => {
  it('composes chained renames to the original source field name', () => {
    const transforms = [
      {
        mapping: { Product: { displayPrice: 'price' } },
      },
      {
        mapping: { Product: { price: 'cost' } },
      },
    ];
    const subschema = { transforms } as any;
    expect(resolveSourceFieldName(subschema, 'Product', 'displayPrice')).toBe('cost');
  });

  it('returns the field name when no rename matches', () => {
    const subschema = { transforms: [{ mapping: { Product: { other: 'x' } } }] } as any;
    expect(resolveSourceFieldName(subschema, 'Product', 'cost')).toBe('cost');
  });
});
