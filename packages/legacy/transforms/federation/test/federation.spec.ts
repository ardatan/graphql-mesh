/* eslint-disable import/no-extraneous-dependencies */
import { buildSchema } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { defaultImportFn, PubSub } from '@graphql-mesh/utils';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { dummyLogger as logger } from '../../../../testing/dummyLogger';
import FederationTransform from '../src/index.js';

describe('transform-federation', () => {
  const apiName = 'test';
  const baseDir = __dirname;
  const config = {};
  const importFn = defaultImportFn;
  const cache = new InMemoryLRUCache();
  const pubsub = new PubSub();
  it('should trim non federation directives', () => {
    using cache = new InMemoryLRUCache();
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
      "schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: []) {
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
});
