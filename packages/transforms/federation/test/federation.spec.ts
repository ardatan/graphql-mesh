/* eslint-disable import/no-extraneous-dependencies */
import { buildSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import FederationTransform from '@graphql-mesh/transform-federation';
import { defaultImportFn, DefaultLogger, PubSub } from '@graphql-mesh/utils';
import { printSchemaWithDirectives } from '@graphql-tools/utils';

describe('transform-federation', () => {
  const apiName = 'test';
  const baseDir = __dirname;
  const config = {};
  const importFn = defaultImportFn;
  const cache = new InMemoryLRUCache();
  const logger = new DefaultLogger('test');
  const pubsub = new PubSub();
  it('should trim non federation directives', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @fooField on FIELD_DEFINITION
      directive @foo on OBJECT | INTERFACE

      type Query {
        foo: Foo @fooField
      }
      type Foo @foo {
        bar: String
      }
    `);
    const transform = new FederationTransform({
      apiName,
      baseDir,
      config,
      cache,
      importFn,
      logger,
      pubsub,
    });
    const transformedSchema = transform.transformSchema(schema, {
      schema,
    });
    expect(printSchemaWithDirectives(transformedSchema)).toMatchInlineSnapshot(`
      "schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: []) {
        query: Query
      }

      type Query {
        foo: Foo
        _entities(representations: [_Any!]!): [_Entity]!
        _service: _Service!
      }

      union _Entity

      scalar _Any

      type _Service {
        """
        The sdl representing the federated service capabilities. Includes federation directives, removes federation types, and includes rest of full schema after schema directives have been applied
        """
        sdl: String
      }

      type Foo {
        bar: String
      }"
    `);
  });

  it('should transform to federation schema', () => {
    const schema = buildSchema(/* GraphQL */ `
      directive @custom on OBJECT

      type Query {
        product(id: ID!): Product
      }

      type Product @custom {
        sku: String!
        package: String!
      }

      type Inventory {
        id: ID!
        products: [Product!]!
      }
    `);

    const transform = new FederationTransform({
      apiName,
      baseDir,
      config: {
        composeDirective: ['custom'],
        types: [
          {
            name: 'Product',
            config: {
              key: [
                {
                  fields: 'sku package',
                },
              ],
            },
          },
          {
            name: 'Inventory',
            config: {
              interfaceObject: true,
              key: [
                {
                  fields: 'id',
                },
              ],
            },
          },
        ],
      },
      cache,
      importFn,
      logger,
      pubsub,
    });
    const transformedSchema = transform.transformSchema(schema, {
      schema,
    });
    expect(printSchemaWithDirectives(transformedSchema)).toMatchInlineSnapshot(`
      "schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"]) @link(url: "https://myspecs.dev/myCustomDirective/v1.0", import: ["@custom"]) @composeDirective(name: "@custom") {
        query: Query
      }

      directive @custom on OBJECT

      type Query {
        product(id: ID!): Product
        _entities(representations: [_Any!]!): [_Entity]!
        _service: _Service!
      }

      union _Entity = Product | Inventory

      scalar _Any

      type _Service {
        """
        The sdl representing the federated service capabilities. Includes federation directives, removes federation types, and includes rest of full schema after schema directives have been applied
        """
        sdl: String
      }

      type Product @key(fields: "sku package") {
        sku: String!
        package: String!
      }

      type Inventory @key(fields: "id") @interfaceObject @custom {
        id: ID!
        products: [Product!]!
      }"
    `);
  });
});
