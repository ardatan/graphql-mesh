'use strict';

/* globals beforeAll, test, expect */

import { graphql, parse, validate } from 'graphql';

import * as openAPIToGraphQL from '../src/openapi-to-graphql/index';
import { Options } from '../src/openapi-to-graphql/types/options';
import { startServer, stopServer } from './example_api_server';
import fetch from 'cross-undici-fetch';

const oas = require('./fixtures/example_oas_combined.json');
const PORT = 3010;
// Update PORT for this test case:
oas.servers[0].variables.port.default = String(PORT);

/**
 * Set up the schema first and run example API server
 */
beforeAll(() => {
  return Promise.all([
    openAPIToGraphQL.createGraphQLSchema(oas, {
      fillEmptyResponses: true,
      fetch,
    }),
    startServer(PORT),
  ]);
});

/**
 * Shut down API server
 */
afterAll(() => {
  return stopServer();
});

test('addLimitArgument and allOf', () => {
  const options: Options<any, any, any> = {
    addLimitArgument: true,
    fetch,
  };

  const query = `query {
    cars(limit: 1) {
      model
    }
  }`;

  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(result.data.cars.length).toEqual(1);
    });
  });
});

test('addLimitArgument but no value provided', () => {
  const options: Options<any, any, any> = {
    addLimitArgument: true,
    fetch,
  };

  const query = `query {
    cars {
      model
    }
  }`;

  return openAPIToGraphQL.createGraphQLSchema(oas, options).then(({ schema }) => {
    const ast = parse(query);
    const errors = validate(schema, ast);
    expect(errors).toEqual([]);
    return graphql(schema, query).then(result => {
      expect(result.errors).toBeUndefined();
      expect(result.data.cars.length).toEqual(4);
    });
  });
});
