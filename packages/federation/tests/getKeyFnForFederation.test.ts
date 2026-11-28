import { GraphQLError } from 'graphql';
import { getKeyFnForFederation } from '../src/utils';

describe('getKeyFnForFederation', () => {
  it('with arguments', () => {
    const keys = ['name', 'address { city }', 'price(currency: "USD")'];
    const data = {
      __typename: 'Test',
      name: 'Test',
      address: {
        __typename: 'Address',
        city: 'Test City',
        street: 'Test Street',
      },
      price: 100,
      extra: 'Extra',
    };
    const keyFn = getKeyFnForFederation('Test', keys);
    expect(keyFn(data)).toEqual({
      __typename: 'Test',
      name: 'Test',
      address: {
        __typename: 'Address',
        city: 'Test City',
      },
      price: 100,
    });
  });
  it('with repeating fields returning arrays', () => {
    const keys = ['userOrders { id }', 'userOrders { tag }'];
    const data = {
      __typename: 'User',
      id: 1,
      name: 'Test',
      userOrders: [
        {
          __typename: 'UserOrder',
          id: '1',
          total: 100,
          tag: 'Test1',
        },
        {
          __typename: 'UserOrder',
          id: '2',
          total: 400,
          tag: 'Test2',
        },
      ],
    };
    const keyFn = getKeyFnForFederation('User', keys);
    expect(keyFn(data)).toEqual({
      __typename: 'User',
      userOrders: [
        {
          __typename: 'UserOrder',
          id: '1',
          tag: 'Test1',
        },
        {
          __typename: 'UserOrder',
          id: '2',
          tag: 'Test2',
        },
      ],
    });
  });
  // `requires: "id environment{id}"` (no space before `{`) used to keep only
  // `id` because keys were split on spaces. Nested selections must parse the
  // same way as `environment { id }`.
  it('parses a nested requires field without a space before the brace', () => {
    const keyFn = getKeyFnForFederation('Whatever', ['id environment{id}']);
    expect(
      keyFn({
        __typename: 'Whatever',
        id: 'w1',
        environment: { __typename: 'Environment', id: 'e1', extra: 'drop' },
        extra: 'drop',
      }),
    ).toEqual({
      __typename: 'Whatever',
      id: 'w1',
      environment: { __typename: 'Environment', id: 'e1' },
    });
  });

  it('filter errors as null', () => {
    const key = ['name', 'address { city }'];
    const data = {
      __typename: 'Test',
      name: 'Test',
      address: new GraphQLError('Failed to fetch address'),
      price: 100,
      extra: 'Extra',
    };
    const keyFn = getKeyFnForFederation('Test', key);
    expect(keyFn(data)).toEqual({
      __typename: 'Test',
      name: 'Test',
      address: null,
    });
  });
});
