import { Decimal128, ObjectId } from 'mongodb';
import {
  buildMongoFilter,
  buildMongoSort,
  buildSetDocument,
  coerceDeep,
  coerceFilterValue,
  configureObjectIdFields,
  configureRequiredFields,
  graphqlFilterToMongo,
  graphqlSortToMongo,
  graphqlUpdateToMongo,
  normalizeFilterDoc,
  stripInputPlaceholder,
} from '../src/filter.js';

describe('mongo filter mapping', () => {
  it('builds equality from mapping binders', () => {
    expect(
      buildMongoFilter(
        `
          _id: $args.id
          gender: "male"
        `,
        { args: { id: '507f1f77bcf86cd799439011' } },
      ),
    ).toMatchObject({
      gender: 'male',
    });
    const byId = buildMongoFilter(`_id: $args.id`, {
      args: { id: '507f1f77bcf86cd799439011' },
    });
    expect(byId._id).toBeInstanceOf(ObjectId);
    expect(String(byId._id)).toBe('507f1f77bcf86cd799439011');
  });

  it('passes through native Mongo filter docs with $gte', () => {
    expect(
      buildMongoFilter(`$args.query`, {
        args: { query: { name: 'Ada', age: { $gte: 30 } } },
      }),
    ).toEqual({
      name: 'Ada',
      age: { $gte: 30 },
    });
  });

  it('maps typed query operators (gte / _gte) to $gte', () => {
    expect(
      buildMongoFilter(`$args.query`, {
        args: { query: { name: { eq: 'Ada' }, age: { gte: 30 } } },
      }),
    ).toEqual({
      name: 'Ada',
      age: { $gte: 30 },
    });

    expect(graphqlFilterToMongo({ age: { _gte: 30, _lt: 40 } })).toEqual({
      age: { $gte: 30, $lt: 40 },
    });
  });

  it('merges structured query via bare binder and spread', () => {
    expect(
      buildMongoFilter(
        `
          gender: "female"
          ...$args.query
        `,
        { args: { query: { age: { lt: 40 } } } },
      ),
    ).toEqual({
      gender: 'female',
      age: { $lt: 40 },
    });
  });

  it('keeps fixed binders when spread query overlaps keys via $and', () => {
    expect(
      buildMongoFilter(
        `
          gender: "female"
          ...$args.query
        `,
        { args: { query: { gender: { eq: 'male' } } } },
      ),
    ).toEqual({
      $and: [{ gender: 'female' }, { gender: 'male' }],
    });
  });

  it('accumulates $and from combinators and multi elemMatch', () => {
    expect(
      graphqlFilterToMongo({
        and: [{ age: { gte: 18 } }],
        languages: [{ language: { eq: 'en' } }, { language: { eq: 'fr' } }],
      }),
    ).toEqual({
      $and: [
        { age: { $gte: 18 } },
        { languages: { $elemMatch: { language: 'en' } } },
        { languages: { $elemMatch: { language: 'fr' } } },
      ],
    });
  });

  it('merges nested logical filters instead of Object.assign-replacing $or/$and', () => {
    expect(
      graphqlFilterToMongo({
        or: [{ active: { eq: true } }],
        address: { or: [{ city: { eq: 'Paris' } }] },
      }),
    ).toEqual({
      $and: [{ $or: [{ active: true }] }, { $or: [{ 'address.city': 'Paris' }] }],
    });
    // Nested `$or` first must not be replaced by a later root `or`.
    expect(
      graphqlFilterToMongo({
        address: { or: [{ city: { eq: 'Paris' } }] },
        or: [{ active: { eq: true } }],
      }),
    ).toEqual({
      $and: [{ $or: [{ 'address.city': 'Paris' }] }, { $or: [{ active: true }] }],
    });
  });

  it('handles empty and/or without emitting invalid Mongo predicates', () => {
    expect(graphqlFilterToMongo({ and: [], name: { eq: 'Ada' } })).toEqual({ name: 'Ada' });
    expect(graphqlFilterToMongo({ or: [], name: { eq: 'Ada' } })).toEqual({
      name: 'Ada',
      $and: [{ $nor: [{}] }],
    });
    // Empty `or` inside $elemMatch must not match elements lacking `_id`.
    expect(graphqlFilterToMongo({ languages: [{ or: [] }] })).toEqual({
      languages: { $elemMatch: { $and: [{ $nor: [{}] }] } },
    });
  });

  it('converts ObjectId only for declared id/_id/objectId fields', () => {
    const hex = '507f1f77bcf86cd799439011';
    configureObjectIdFields(['authorId', 'friendIds']);
    expect(coerceFilterValue(hex, { asObjectId: true })).toBeInstanceOf(ObjectId);
    expect(coerceFilterValue(hex)).toBe(hex);
    expect(graphqlFilterToMongo({ token: { eq: hex } })).toEqual({ token: hex });
    expect(graphqlFilterToMongo({ id: { eq: hex } })._id).toBeInstanceOf(ObjectId);
    expect(graphqlFilterToMongo({ authorId: { eq: hex } }).authorId).toBeInstanceOf(ObjectId);
    const friendIds = graphqlFilterToMongo({ friendIds: { in: [hex] } }).friendIds as {
      $in: unknown[];
    };
    expect(friendIds.$in[0]).toBeInstanceOf(ObjectId);
    // Undeclared *Id-looking keys stay strings.
    expect(graphqlFilterToMongo({ otherId: { eq: hex } }).otherId).toBe(hex);
    configureObjectIdFields(undefined);
  });

  it('preserves Decimal128 instances and Extended JSON, not numeric-looking strings', () => {
    const d = Decimal128.fromString('12.50');
    expect(graphqlUpdateToMongo({ set: { salaryDecimal: d } })).toEqual({
      $set: { salaryDecimal: d },
    });
    expect(coerceFilterValue('12.50')).toBe('12.50');
    expect(coerceFilterValue({ $numberDecimal: '12.50' })).toBeInstanceOf(Decimal128);
  });

  it('converts Extended JSON $numberDecimal before object recursion on update/insert/query', () => {
    const updated = graphqlUpdateToMongo({
      set: { salaryDecimal: { $numberDecimal: '12.50' } },
    });
    const setDoc = updated.$set as Record<string, unknown>;
    expect(setDoc.salaryDecimal).toBeInstanceOf(Decimal128);
    expect(String(setDoc.salaryDecimal)).toBe('12.50');

    const inserted = buildSetDocument('salaryDecimal: $args.document.salaryDecimal', {
      args: { document: { salaryDecimal: { $numberDecimal: '12.50' } } },
    });
    expect(inserted.salaryDecimal).toBeInstanceOf(Decimal128);

    const native = normalizeFilterDoc({
      salaryDecimal: { $numberDecimal: '12.50' },
      nested: { amount: { $numberDecimal: '1.00' } },
    });
    expect(native.salaryDecimal).toBeInstanceOf(Decimal128);
    expect((native.nested as { amount: unknown }).amount).toBeInstanceOf(Decimal128);

    const queried = graphqlFilterToMongo({
      salaryDecimal: { eq: { $numberDecimal: '12.50' } },
    });
    expect(queried.salaryDecimal).toBeInstanceOf(Decimal128);

    // Nested-only Extended JSON (no top-level `$`) must convert before flatten.
    const nestedOnly = graphqlFilterToMongo({
      nested: { amount: { $numberDecimal: '1.00' } },
    });
    expect(nestedOnly['nested.amount']).toBeInstanceOf(Decimal128);
    expect(nestedOnly).not.toHaveProperty('nested.amount.$numberDecimal');

    // Similar Extended JSON wrappers (`$oid`) also convert before recurse.
    const withOid = normalizeFilterDoc({
      _id: { $oid: '507f1f77bcf86cd799439011' },
    });
    expect(withOid._id).toBeInstanceOf(ObjectId);
    expect(String(withOid._id)).toBe('507f1f77bcf86cd799439011');

    // Canonical `$numberLong` must stay Long (not rounded Number) in non-relaxed mode.
    const longVal = coerceDeep({ n: { $numberLong: '9007199254740993' } }) as {
      n: { _bsontype?: string; toString(): string };
    };
    expect(longVal.n._bsontype || longVal.n.constructor?.name).toMatch(/Long/);
    expect(String(longVal.n)).toBe('9007199254740993');

    // Canonical `$binary: { base64, subType }` → BSON Binary.
    const bin = coerceDeep({
      blob: { $binary: { base64: 'AQI=', subType: '00' } },
    }) as { blob: { _bsontype?: string; buffer?: Uint8Array } };
    expect(bin.blob._bsontype || bin.blob.constructor?.name).toMatch(/Binary/);
  });

  it('maps array id binders to $in', () => {
    const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
    const filter = buildMongoFilter(`_id: $args.ids`, { args: { ids } });
    expect(filter._id).toMatchObject({ $in: expect.any(Array) });
    const inIds = (filter._id as { $in: unknown[] }).$in;
    expect(inIds.every(v => v instanceof ObjectId)).toBe(true);
    expect(inIds.map(String)).toEqual(ids);
  });

  it('maps GraphQL where ops to Mongo operators', () => {
    expect(
      graphqlFilterToMongo({
        and: [{ name: { regex: '^A' } }, { age: { in: [1, 2] } }],
        or: [{ gender: { eq: 'male' } }],
      }),
    ).toEqual({
      $and: [{ name: { $regex: '^A' } }, { age: { $in: [1, 2] } }],
      $or: [{ gender: 'male' }],
    });
  });

  it('flattens embedded nested WhereInput to dotted paths', () => {
    expect(
      graphqlFilterToMongo({
        address: { street: { eq: 'Main' }, geo: [1.1, 2.2] },
        contacts: { email: { regex: '@example.com$' } },
      }),
    ).toEqual({
      'address.street': 'Main',
      'address.geo': [1.1, 2.2],
      'contacts.email': { $regex: '@example.com$' },
    });
  });

  it('maps document-array WhereInput lists to $elemMatch', () => {
    expect(
      graphqlFilterToMongo({
        languages: [{ language: { eq: 'en' }, skill: { eq: 'fluent' } }],
      }),
    ).toEqual({
      languages: { $elemMatch: { language: 'en', skill: 'fluent' } },
    });

    expect(
      graphqlFilterToMongo({
        languages: [{ language: { eq: 'en' } }, { skill: { eq: 'basic' } }],
      }),
    ).toEqual({
      $and: [
        { languages: { $elemMatch: { language: 'en' } } },
        { languages: { $elemMatch: { skill: 'basic' } } },
      ],
    });
  });

  it('maps field_asc/field_desc sort enum list to Mongo sort', () => {
    expect(graphqlSortToMongo(['age_desc', 'name_asc', 'id_desc'])).toEqual({
      age: -1,
      name: 1,
      _id: -1,
    });
    expect(graphqlSortToMongo({ age: 'desc', id: 'asc' })).toEqual({ age: -1, _id: 1 });
    expect(buildMongoSort('$args.sort', { args: { sort: ['age_desc'] } })).toEqual({ age: -1 });
  });

  it('maps typed update ops (set/inc/unset) to $set/$inc/$unset', () => {
    expect(
      graphqlUpdateToMongo({
        set: { name: 'Ada' },
        inc: { age: 1 },
        unset: { someMixed: true },
      }),
    ).toEqual({
      $set: { name: 'Ada' },
      $inc: { age: 1 },
      $unset: { someMixed: '' },
    });
    expect(graphqlUpdateToMongo({ _inc: { age: 2 } })).toEqual({ $inc: { age: 2 } });
    expect(graphqlUpdateToMongo({ $set: { name: 'Alan' } })).toEqual({ $set: { name: 'Alan' } });
    expect(graphqlUpdateToMongo({ name: 'Grace' })).toEqual({ $set: { name: 'Grace' } });
  });

  it('rejects explicit null on required fields but allows omit; strips _ placeholder', () => {
    configureRequiredFields(['name']);
    expect(() => graphqlUpdateToMongo({ set: { name: null, age: 1 } })).toThrow(/name/);
    expect(graphqlUpdateToMongo({ set: { age: 1 } })).toEqual({ $set: { age: 1 } });
    expect(stripInputPlaceholder({ _: 'x', name: 'Ada' })).toEqual({ name: 'Ada' });
    expect(graphqlUpdateToMongo({ set: { _: 'x', name: 'Ada' } })).toEqual({
      $set: { name: 'Ada' },
    });
    configureRequiredFields(undefined);
  });
});
