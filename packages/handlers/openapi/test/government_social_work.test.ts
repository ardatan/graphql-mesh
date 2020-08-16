// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

import { GraphQLSchema } from 'graphql';

/* globals beforeAll, test, expect */

const openAPIToGraphQL = require('../src/openapi-to-graphql/index');
const Oas3Tools = require('../src/openapi-to-graphql/oas_3_tools');
const { parse, validate } = require('graphql');
import fetch from 'cross-fetch';

/**
 * Set up the schema first
 */
const oas = require('./fixtures/government_social_work.json');

let createdSchema: GraphQLSchema;
beforeAll(() => {
  return openAPIToGraphQL.createGraphQLSchema(oas, { fetch }).then(({ schema, report }: any) => {
    createdSchema = schema;
  });
});

test('All query endpoints present', () => {
  let oasGetCount = 0;
  for (const path in oas.paths) {
    for (const method in oas.paths[path]) {
      if (method === 'get') oasGetCount++;
    }
  }
  const gqlTypes = Object.keys(createdSchema.getQueryType().getFields()).length;
  expect(gqlTypes).toEqual(oasGetCount);
});

test('All mutation endpoints present', () => {
  let oasMutCount = 0;
  for (const path in oas.paths) {
    for (const method in oas.paths[path]) {
      if (Oas3Tools.isOperation(method) && method !== 'get') oasMutCount++;
    }
  }
  const gqlTypes = Object.keys(createdSchema.getMutationType().getFields()).length;
  expect(gqlTypes).toEqual(oasMutCount);
});

test('Get resource', () => {
  const query = `{
    assessmentTypes (
      contentType: ""
      acceptLanguage: ""
      userAgent:""
      apiVersion:"1.1.0"
      offset: "40"
      limit: "test"
    ) {
      data {
        assessmentTypeId
      }
    }
  }`;
  const ast = parse(query);
  const errors = validate(createdSchema, ast);
  expect(errors).toEqual([]);
});
