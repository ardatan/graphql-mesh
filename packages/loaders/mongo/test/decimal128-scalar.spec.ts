import { Kind } from 'graphql';
import { Decimal128 } from 'mongodb';
import { GraphQLDecimal128 } from '../src/scalars.js';

describe('GraphQLDecimal128 (Mongoose-aligned cast)', () => {
  it('parses string / number / Extended JSON like mongoose castDecimal128', () => {
    expect(GraphQLDecimal128.parseValue('3.1415')).toEqual(Decimal128.fromString('3.1415'));
    expect(GraphQLDecimal128.parseValue(42)).toEqual(Decimal128.fromString('42'));
    expect(GraphQLDecimal128.parseValue({ $numberDecimal: '99.01' })).toEqual(
      Decimal128.fromString('99.01'),
    );
    expect(GraphQLDecimal128.parseValue(Decimal128.fromString('1.5'))).toEqual(
      Decimal128.fromString('1.5'),
    );
  });

  it('serializes BSON Decimal128 to string', () => {
    expect(GraphQLDecimal128.serialize(Decimal128.fromString('12.50'))).toBe('12.50');
    expect(GraphQLDecimal128.serialize('7.0')).toBe('7.0');
  });

  it('parses string/float/int literals and $numberDecimal object', () => {
    expect(GraphQLDecimal128.parseLiteral({ kind: Kind.STRING, value: '1.25' }, {})).toEqual(
      Decimal128.fromString('1.25'),
    );
    expect(GraphQLDecimal128.parseLiteral({ kind: Kind.FLOAT, value: '2.5' }, {})).toEqual(
      Decimal128.fromString('2.5'),
    );
    expect(
      GraphQLDecimal128.parseLiteral(
        {
          kind: Kind.OBJECT,
          fields: [
            {
              kind: Kind.OBJECT_FIELD,
              name: { kind: Kind.NAME, value: '$numberDecimal' },
              value: { kind: Kind.STRING, value: '8.8' },
            },
          ],
        } as any,
        {},
      ),
    ).toEqual(Decimal128.fromString('8.8'));
  });
});
