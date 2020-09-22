// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

/* globals beforeAll, test, expect */

import { createGraphQLSchema } from '../src/openapi-to-graphql';
import * as Oas3Tools from '../src/openapi-to-graphql/oas_3_tools';
import { GraphQLSchema, parse, validate } from 'graphql';

/**
 * Set up the schema first
 */
const oas = require('./fixtures/government_social_work.json');

let createdSchema: GraphQLSchema;
beforeAll(async () => {
  const { schema } = await createGraphQLSchema(oas);
  createdSchema = schema;
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
      if (Oas3Tools.isHttpMethod(method) && method !== 'get') oasMutCount++;
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
