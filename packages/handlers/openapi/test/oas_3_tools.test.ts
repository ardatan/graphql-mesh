/* eslint-disable camelcase */
// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import * as Oas3Tools from '../src/openapi-to-graphql/oas_3_tools';

/* globals test, expect */

const { GraphQLSchema, GraphQLObjectType, GraphQLString, graphql } = require('graphql');

test('Applying sanitize multiple times does not change outcome', () => {
  const str = 'this Super*annoying-string()';
  const once = Oas3Tools.sanitize(str, Oas3Tools.CaseStyle.PascalCase);
  const twice = Oas3Tools.sanitize(once, Oas3Tools.CaseStyle.PascalCase);
  expect(twice).toEqual(once);
});

test('Sanitize object keys', () => {
  const obj = {
    a_key: {
      'b&**key': 'test !!',
    },
  };
  const clean = Oas3Tools.sanitizeObjectKeys(obj);
  expect(clean).toEqual({
    aKey: {
      bKey: 'test !!',
    },
  });
});

test('Sanitize object keys including array', () => {
  const obj = {
    a_key: {
      'b&**key': 'test !!',
      'asf blah': [{ 'a)(a': 'test2' }],
    },
  };
  const clean = Oas3Tools.sanitizeObjectKeys(obj);
  expect(clean).toEqual({
    aKey: {
      bKey: 'test !!',
      asfBlah: [
        {
          aA: 'test2',
        },
      ],
    },
  });
});

test('Sanitize object keys when given an array', () => {
  const obj = [
    {
      'a)(a': {
        b_2: 'test',
      },
    },
  ];
  const clean = Oas3Tools.sanitizeObjectKeys(obj);
  expect(clean).toEqual([
    {
      aA: {
        b2: 'test',
      },
    },
  ]);
});

const mapping = {
  productId: 'product-id',
  productName: 'product-name',
  productTag: 'product-tag',
};

test('Desanitize object keys', () => {
  const obj = {
    productId: '123',
    info: {
      productName: 'Soccer',
    },
  };
  const raw = Oas3Tools.desanitizeObjectKeys(obj, mapping);
  expect(raw).toEqual({
    'product-id': '123',
    info: {
      'product-name': 'Soccer',
    },
  });
});

test('Desanitize object keys including array', () => {
  const obj = {
    productId: {
      info: [{ productName: 'test1' }, { productTag: 'test2' }],
    },
  };
  const clean = Oas3Tools.desanitizeObjectKeys(obj, mapping);
  expect(clean).toEqual({
    'product-id': {
      info: [{ 'product-name': 'test1' }, { 'product-tag': 'test2' }],
    },
  });
});

test('Desanitize object keys when given an array', () => {
  const obj = [
    {
      productName: {
        productTag: 'test',
      },
    },
  ];
  const clean = Oas3Tools.desanitizeObjectKeys(obj, mapping);
  expect(clean).toEqual([
    {
      'product-name': {
        'product-tag': 'test',
      },
    },
  ]);
});

test('Desanitize object keys with null value', () => {
  const obj: any = {
    productId: null,
  };
  const raw = Oas3Tools.desanitizeObjectKeys(obj, mapping);
  expect(raw).toEqual({
    'product-id': null,
  });
});

test('Properly treat null values during sanitization', () => {
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        User: {
          name: 'name',
          type: new GraphQLObjectType({
            name: 'user',
            fields: {
              name: {
                type: GraphQLString,
              },
            },
          }),
          resolve: (root: any, args: any, context: any) => {
            const data: any = {
              name: null,
            };
            return Oas3Tools.sanitizeObjectKeys(data);
          },
        },
      },
    }),
  });

  const query = `{
    User {
      name
    }
  }`;

  graphql({ schema, source: query }).then((result: any) => {
    expect(result).toEqual({
      data: {
        User: {
          name: null,
        },
      },
    });
  });
});
