import { execute, GraphQLSchema, parse } from 'graphql';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { Request, Response } from '@whatwg-node/fetch';
import { loadGraphQLSchemaFromOpenAPI } from '../src/loadGraphQLSchemaFromOpenAPI.js';

let createdSchema: GraphQLSchema;

describe('OpenAPI loader: Required allOf', () => {
  it('type should be required in all types', async () => {
    const endpoint = `http://localhost:3000/`;
    createdSchema = await loadGraphQLSchemaFromOpenAPI('RequiredAllOf', {
      async fetch(input, init) {
        const req = new Request(input, init);
        const json = await req.json<{ id: string; name: string }>();

        return Response.json({ name: json.name });
      },
      endpoint,
      source: './fixtures/required-allof.yml',
      cwd: __dirname,
    });

    expect(printSchemaWithDirectives(createdSchema)).toMatchInlineSnapshot(`
    "schema {
      query: Query
      mutation: Mutation
    }

    directive @discriminator(field: String, mapping: ObjMap) on INTERFACE | UNION

    directive @length(min: Int, max: Int) on SCALAR

    directive @globalOptions(sourceName: String, endpoint: String, operationHeaders: ObjMap, queryStringOptions: ObjMap, queryParams: ObjMap) on OBJECT

    directive @httpOperation(path: String, operationSpecificHeaders: ObjMap, httpMethod: HTTPMethod, isBinary: Boolean, requestBaseBody: ObjMap, queryParamArgMap: ObjMap, queryStringOptionsByParam: ObjMap) on FIELD_DEFINITION

    type Admin implements User {
      "The Name."
      name: query_getAdmin_allOf_0_name
      "The type"
      type: String!
      "The admin"
      admin: Boolean
    }

    interface User @discriminator(field: "type") {
      "The Name."
      name: query_getAdmin_allOf_0_name
      "The type"
      type: String!
    }

    "The Name."
    scalar query_getAdmin_allOf_0_name @length(min: null, max: 100)

    type Query @globalOptions(sourceName: "RequiredAllOf", endpoint: "http://localhost:3000/") {
      "Get admin"
      getAdmin: Admin @httpOperation(path: "/admin", operationSpecificHeaders: "{\\"accept\\":\\"application/json\\"}", httpMethod: GET)
    }

    type Mutation {
      "Create users"
      createUsers: Void @httpOperation(path: "/create", httpMethod: POST)
    }

    "Represents empty values"
    scalar Void

    scalar ObjMap

    enum HTTPMethod {
      GET
      HEAD
      POST
      PUT
      DELETE
      CONNECT
      OPTIONS
      TRACE
      PATCH
    }"
    `);
  });

  it('type should be required in all types with optional schema first', async () => {
    const endpoint = `http://localhost:3000/`;
    createdSchema = await loadGraphQLSchemaFromOpenAPI('RequiredAllOf', {
      async fetch(input, init) {
        const req = new Request(input, init);
        const json = await req.json<{ id: string; name: string }>();

        return Response.json({ name: json.name });
      },
      endpoint,
      source: './fixtures/required-allof2.yml',
      cwd: __dirname,
    });

    expect(printSchemaWithDirectives(createdSchema)).toMatchInlineSnapshot(`
    "schema {
      query: Query
      mutation: Mutation
    }

    directive @discriminator(field: String, mapping: ObjMap) on INTERFACE | UNION

    directive @length(min: Int, max: Int) on SCALAR

    directive @globalOptions(sourceName: String, endpoint: String, operationHeaders: ObjMap, queryStringOptions: ObjMap, queryParams: ObjMap) on OBJECT

    directive @httpOperation(path: String, operationSpecificHeaders: ObjMap, httpMethod: HTTPMethod, isBinary: Boolean, requestBaseBody: ObjMap, queryParamArgMap: ObjMap, queryStringOptionsByParam: ObjMap) on FIELD_DEFINITION

    type Admin implements User {
      "The type"
      type: String!
      "The admin"
      admin: Boolean
      "The Name."
      name: query_getAdmin_allOf_1_name
    }

    interface User @discriminator(field: "type") {
      "The Name."
      name: query_getAdmin_allOf_1_name
      "The type"
      type: String!
    }

    "The Name."
    scalar query_getAdmin_allOf_1_name @length(min: null, max: 100)

    type Query @globalOptions(sourceName: "RequiredAllOf", endpoint: "http://localhost:3000/") {
      "Get admin"
      getAdmin: Admin @httpOperation(path: "/admin", operationSpecificHeaders: "{\\"accept\\":\\"application/json\\"}", httpMethod: GET)
    }

    type Mutation {
      "Create users"
      createUsers: Void @httpOperation(path: "/create", httpMethod: POST)
    }

    "Represents empty values"
    scalar Void

    scalar ObjMap

    enum HTTPMethod {
      GET
      HEAD
      POST
      PUT
      DELETE
      CONNECT
      OPTIONS
      TRACE
      PATCH
    }"
    `);
  });
});
