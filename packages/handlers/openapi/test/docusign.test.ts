// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: openapi-to-graphql
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

/* globals test, expect */

import * as openAPIToGraphQL from '../src/openapi-to-graphql/index';
import { Options } from '../src/openapi-to-graphql/types/options';
import fetch from 'cross-fetch';

const oas = require('./fixtures/docusign.json');

test('Generate schema without problems', () => {
  const options: Options<any, any, any> = {
    strict: false,
    fetch,
  };
  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    expect(schema).toBeTruthy();
  });
});
