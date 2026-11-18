import { Decimal128, ObjectId } from 'mongodb';
import {
  buildMongoFilter,
  buildMongoSort,
  buildSetDocument,
  coerceDeep,
  coerceFilterValue,
  configureObjectIdFields,
  configurePlaceholderFields,
  configureRequiredFields,
  graphqlFilterToMongo,
  graphqlSortToMongo,
  graphqlUpdateToMongo,
  isMatchNothingFilter,
  isUniversallyMatchingFilter,
  MATCH_NOTHING_FILTER,
  normalizeFilterDoc,
  runWithMongoFieldRuntime,
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
    // Nested empty `and` must not become `$and: [{}]` (matches all).
    const nestedEmptyAnd = graphqlFilterToMongo({ and: [{ and: [] }] });
    expect(isUniversallyMatchingFilter(nestedEmptyAnd)).toBe(false);
    expect(nestedEmptyAnd).toEqual({ $and: [MATCH_NOTHING_FILTER] });
    // Vacuous `$or` branch matches all — keep it (do not prune before `not`).
    expect(isUniversallyMatchingFilter({ $or: [{}] })).toBe(true);
    expect(graphqlFilterToMongo({ or: [{ and: [] }] })).toEqual({ $or: [{}] });
    expect(
      isUniversallyMatchingFilter(
        graphqlFilterToMongo({ or: [{ name: { eq: 'Ada' } }, { and: [] }] }),
      ),
    ).toBe(true);
    // `not` of match-all (vacuous OR branch) must stay match-nothing.
    const notVacuousOr = graphqlFilterToMongo({
      not: { or: [{}, { name: { eq: 'Ada' } }] },
    });
    expect(isMatchNothingFilter(notVacuousOr)).toBe(true);
    expect(isUniversallyMatchingFilter(notVacuousOr)).toBe(false);
    // All-contradiction OR is match-nothing; negating it is match-all (bulk guard).
    expect(isMatchNothingFilter({ $or: [MATCH_NOTHING_FILTER, MATCH_NOTHING_FILTER] })).toBe(true);
    const notAllFalseOr = graphqlFilterToMongo({
      not: { or: [{ or: [] }, { and: [{ and: [] }] }] },
    });
    expect(isUniversallyMatchingFilter(notAllFalseOr)).toBe(true);
    // `not` of match-nothing is match-all — bulk guard must detect it.
    const notNestedEmpty = graphqlFilterToMongo({ not: { and: [{ and: [] }] } });
    expect(isUniversallyMatchingFilter(notNestedEmpty)).toBe(true);
    expect(isUniversallyMatchingFilter(graphqlFilterToMongo({ not: { or: [] } }))).toBe(true);
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

  it('scopes ObjectId and required fields by collection', () => {
    const hex = '507f1f77bcf86cd799439011';
    const runtime = {
      objectIdFields: new Set(['_id', 'id', 'owner']),
      objectIdFieldsByCollection: new Map<string, ReadonlySet<string>>([
        ['posts', new Set(['owner'])],
        // `notes` omitted — loader skips collections with no scoped ObjectId fields.
      ]),
      requiredFields: new Set(['title']),
      requiredFieldsByCollection: new Map<string, ReadonlySet<string>>([
        ['posts', new Set(['title'])],
        // `notes` omitted — missing key falls back to empty scoped set, not flat required.
      ]),
      placeholderFields: new Set(['_']),
      stringIdCollections: new Set<string>(),
    };
    runWithMongoFieldRuntime(runtime, () => {
      expect(graphqlFilterToMongo({ owner: { eq: hex } }, '', 'posts').owner).toBeInstanceOf(
        ObjectId,
      );
      expect(graphqlFilterToMongo({ owner: { eq: hex } }, '', 'notes').owner).toBe(hex);
      expect(() => graphqlUpdateToMongo({ set: { title: null } }, { collection: 'posts' })).toThrow(
        /title/,
      );
      expect(graphqlUpdateToMongo({ set: { title: null } }, { collection: 'notes' })).toEqual({
        $set: { title: null },
      });
    });
  });

  it('keeps _id as string for stringIdCollections (String _id models)', () => {
    const hex = '507f1f77bcf86cd799439011';
    const runtime = {
      objectIdFields: new Set(['_id', 'id']),
      requiredFields: new Set<string>(),
      placeholderFields: new Set(['_']),
      stringIdCollections: new Set(['external_users']),
    };
    const filter = runWithMongoFieldRuntime(runtime, () =>
      buildMongoFilter('_id: $args.id', { args: { id: hex } }, { collection: 'external_users' }),
    );
    expect(filter._id).toBe(hex);
    expect(filter._id).not.toBeInstanceOf(ObjectId);
    // emitRefFields lookup: `_id: $this.authorId` against a String `_id` collection.
    const refLookup = runWithMongoFieldRuntime(runtime, () =>
      buildMongoFilter(
        '_id: $this.authorId',
        { parent: { authorId: hex, title: 'Hello' } },
        { collection: 'external_users' },
      ),
    );
    expect(refLookup._id).toBe(hex);
    expect(typeof refLookup._id).toBe('string');
    expect(refLookup._id).not.toBeInstanceOf(ObjectId);
    // Default ObjectId collections still coerce.
    const oidFilter = runWithMongoFieldRuntime(runtime, () =>
      buildMongoFilter('_id: $args.id', { args: { id: hex } }, { collection: 'users' }),
    );
    expect(oidFilter._id).toBeInstanceOf(ObjectId);
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
    configurePlaceholderFields(['_']);
    expect(() => graphqlUpdateToMongo({ set: { name: null, age: 1 } })).toThrow(/name/);
    // EJSON `$undefined` becomes null after coerce — still reject.
    expect(() => graphqlUpdateToMongo({ set: { name: { $undefined: true }, age: 1 } })).toThrow(
      /name/,
    );
    expect(graphqlUpdateToMongo({ set: { age: 1 } })).toEqual({ $set: { age: 1 } });
    expect(() => graphqlUpdateToMongo({ unset: { name: true } })).toThrow(/name/);
    expect(() => graphqlUpdateToMongo({ rename: { name: 'previousName' } })).toThrow(/name/);
    expect(stripInputPlaceholder({ _: 'x', name: 'Ada' })).toEqual({ name: 'Ada' });
    expect(graphqlUpdateToMongo({ set: { _: 'x', name: 'Ada' } })).toEqual({
      $set: { name: 'Ada' },
    });
    configureRequiredFields(undefined);
    configurePlaceholderFields(undefined);
  });

  it('preserves a real writable _ field when it is not a placeholder', () => {
    configurePlaceholderFields([]); // no placeholders registered
    expect(stripInputPlaceholder({ _: 'keep-me', name: 'Ada' })).toEqual({
      _: 'keep-me',
      name: 'Ada',
    });
    expect(graphqlUpdateToMongo({ set: { _: 'keep-me', name: 'Ada' } })).toEqual({
      $set: { _: 'keep-me', name: 'Ada' },
    });
    configurePlaceholderFields(undefined);
  });

  it('scopes placeholders by collection so a real _ on another model is preserved', () => {
    const runtime = {
      objectIdFields: new Set(['_id', 'id']),
      requiredFields: new Set<string>(),
      placeholderFields: new Set(['_']),
      placeholderFieldsByCollection: new Map<string, ReadonlySet<string>>([
        ['id_only', new Set(['_'])],
        // Empty scoped entry: strip nothing (do not fall back to global `_`).
        ['notes', new Set()],
      ]),
      stringIdCollections: new Set<string>(),
    };
    const stripped = runWithMongoFieldRuntime(runtime, () =>
      stripInputPlaceholder({ _: 'x', name: 'Ada' }, 'id_only'),
    );
    expect(stripped).toEqual({ name: 'Ada' });
    const kept = runWithMongoFieldRuntime(runtime, () =>
      stripInputPlaceholder({ _: 'keep-me', name: 'Ada' }, 'notes'),
    );
    expect(kept).toEqual({ _: 'keep-me', name: 'Ada' });
  });

  it('rejects null on required fields in mapped $set binders', () => {
    configureRequiredFields(['name']);
    expect(() =>
      buildSetDocument('name: $args.name\nage: $args.age', {
        args: { name: null, age: 1 },
      }),
    ).toThrow(/name/);
    expect(
      buildSetDocument('age: $args.age', {
        args: { age: 1 },
      }),
    ).toEqual({ age: 1 });
    configureRequiredFields(undefined);
  });

  it('keeps String _id as string in buildSetDocument for stringIdCollections', () => {
    const hex = '507f1f77bcf86cd799439011';
    const runtime = {
      objectIdFields: new Set(['_id', 'id']),
      requiredFields: new Set<string>(),
      placeholderFields: new Set(['_']),
      stringIdCollections: new Set(['external_users']),
    };
    const doc = runWithMongoFieldRuntime(runtime, () =>
      buildSetDocument(
        '_id: $args.document.id\nname: $args.document.name',
        {
          args: { document: { id: hex, name: 'Ada' } },
        },
        { collection: 'external_users' },
      ),
    );
    expect(doc._id).toBe(hex);
    expect(typeof doc._id).toBe('string');
    expect(doc._id).not.toBeInstanceOf(ObjectId);
  });
});
