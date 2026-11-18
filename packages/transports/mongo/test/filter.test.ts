import {
  buildMongoFilter,
  buildMongoSort,
  graphqlFilterToMongo,
  graphqlSortToMongo,
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
    expect(
      String(
        buildMongoFilter(`_id: $args.id`, {
          args: { id: '507f1f77bcf86cd799439011' },
        })._id,
      ),
    ).toBe('507f1f77bcf86cd799439011');
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

  it('maps array id binders to $in', () => {
    const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
    const filter = buildMongoFilter(`_id: $args.ids`, { args: { ids } });
    expect(filter._id).toMatchObject({ $in: expect.any(Array) });
    expect((filter._id as any).$in.map(String)).toEqual(ids);
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
});
