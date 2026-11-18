import { buildMongoFilter, graphqlFilterToMongo } from '../src/filter.js';

describe('mongo filter', () => {
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

  it('merges structured filter via bare binder and spread', () => {
    expect(
      buildMongoFilter(`$args.filter`, {
        args: { filter: { name: { eq: 'Ada' }, age: { gte: 30 } } },
      }),
    ).toEqual({
      name: 'Ada',
      age: { $gte: 30 },
    });

    expect(
      buildMongoFilter(
        `
          gender: "female"
          ...$args.filter
        `,
        { args: { filter: { age: { lt: 40 } } } },
      ),
    ).toEqual({
      gender: 'female',
      age: { $lt: 40 },
    });
  });

  it('maps array id binders to $in', () => {
    const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
    const filter = buildMongoFilter(`_id: $args._ids`, { args: { _ids: ids } });
    expect(filter._id).toMatchObject({ $in: expect.any(Array) });
    expect((filter._id as any).$in.map(String)).toEqual(ids);
  });

  it('maps GraphQL filter ops to Mongo operators', () => {
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
});
