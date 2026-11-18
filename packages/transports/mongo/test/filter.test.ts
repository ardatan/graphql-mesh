import { buildMongoFilter, graphqlFilterToMongo } from '../src/filter.js';

describe('mongo where mapping', () => {
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

  it('merges structured where via bare binder and spread', () => {
    expect(
      buildMongoFilter(`$args.where`, {
        args: { where: { name: { eq: 'Ada' }, age: { gte: 30 } } },
      }),
    ).toEqual({
      name: 'Ada',
      age: { $gte: 30 },
    });

    expect(
      buildMongoFilter(
        `
          gender: "female"
          ...$args.where
        `,
        { args: { where: { age: { lt: 40 } } } },
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
        AND: [{ name: { regex: '^A' } }, { age: { in: [1, 2] } }],
        OR: [{ gender: { eq: 'male' } }],
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
});
