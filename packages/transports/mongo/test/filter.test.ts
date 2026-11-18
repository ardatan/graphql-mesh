import { buildMongoFilter, graphqlWhereToMongo } from '../src/filter.js';

describe('mongo where filter', () => {
  it('builds equality from mapping binders', () => {
    expect(
      buildMongoFilter(
        `
          _id: $args._id
          gender: "male"
        `,
        { args: { _id: '507f1f77bcf86cd799439011' } },
      ),
    ).toMatchObject({
      gender: 'male',
    });
    expect(
      String(
        buildMongoFilter(`_id: $args._id`, {
          args: { _id: '507f1f77bcf86cd799439011' },
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

  it('maps GraphQL where ops to Mongo operators', () => {
    expect(
      graphqlWhereToMongo({
        AND: [{ name: { regex: '^A' } }, { age: { in: [1, 2] } }],
        OR: [{ gender: { eq: 'male' } }],
      }),
    ).toEqual({
      $and: [{ name: { $regex: '^A' } }, { age: { $in: [1, 2] } }],
      $or: [{ gender: 'male' }],
    });
  });
});
