/* eslint-disable import/no-extraneous-dependencies */

/* eslint-disable import/no-nodejs-modules */
import { promises as fsPromises } from 'fs';
import { createServer, Server } from 'http';
import { AddressInfo, Socket } from 'net';
import { join } from 'path';
import { buildASTSchema, buildSchema, introspectionFromSchema, parse } from 'graphql';
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import {
  InMemoryStoreStorageAdapter,
  MeshStore,
  PredefinedProxyOptions,
} from '@graphql-mesh/store';
import { defaultImportFn, DefaultLogger, PubSub } from '@graphql-mesh/utils';
import { printSchemaWithDirectives } from '@graphql-tools/utils';
import { fetch as fetchFn } from '@whatwg-node/fetch';
import GraphQLHandler from '../src/index.js';

const { readFile } = fsPromises;

const logger = new DefaultLogger('tests');

describe('graphql', () => {
  let store: MeshStore;
  const servers = new Set<Server>();
  const sockets = new Set<Socket>();
  beforeEach(() => {
    store = new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
  });
  afterEach(() => {
    sockets.forEach(socket => socket.destroy());
    servers.forEach(server => server.close());
  });
  it('handle SDL files correctly as endpoint', async () => {
    const sdlFilePath = './fixtures/schema.graphql';
    const handler = new GraphQLHandler({
      name: 'SDLSchema',
      config: {
        source: sdlFilePath,
      },
      baseDir: __dirname,
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      store,
      importFn: defaultImportFn,
      logger,
    });
    const absoluteFilePath = join(__dirname, sdlFilePath);
    const schemaStringFromFile = await readFile(absoluteFilePath, 'utf-8');
    const schemaFromFile = buildSchema(schemaStringFromFile);
    const { schema: schemaFromHandler } = await handler.getMeshSource({
      fetchFn,
    });
    expect(introspectionFromSchema(schemaFromHandler)).toStrictEqual(
      introspectionFromSchema(schemaFromFile),
    );
  });
  it('handle code files exports GraphQLSchema correctly', async () => {
    const schemaFilePath = './fixtures/schema.js';
    const handler = new GraphQLHandler({
      name: 'SDLSchema',
      config: {
        source: schemaFilePath,
      },
      baseDir: __dirname,
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      store,
      importFn: defaultImportFn,
      logger,
    });
    const absoluteFilePath = join(__dirname, schemaFilePath);
    const schemaFromFile = require(absoluteFilePath);
    const { schema: schemaFromHandler } = await handler.getMeshSource({
      fetchFn,
    });
    expect(introspectionFromSchema(schemaFromHandler)).toStrictEqual(
      introspectionFromSchema(schemaFromFile),
    );
  });
  it('handle code files exports DocumentNode correctly', async () => {
    const schemaFilePath = './fixtures/schema-document.js';
    const handler = new GraphQLHandler({
      name: 'SDLSchema',
      config: {
        source: schemaFilePath,
      },
      baseDir: __dirname,
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      store,
      importFn: defaultImportFn,
      logger,
    });
    const absoluteFilePath = join(__dirname, schemaFilePath);
    const schemaDocumentFromFile = require(absoluteFilePath);
    const schemaFromFile = buildASTSchema(schemaDocumentFromFile);
    const { schema: schemaFromHandler } = await handler.getMeshSource({
      fetchFn,
    });
    expect(introspectionFromSchema(schemaFromHandler)).toStrictEqual(
      introspectionFromSchema(schemaFromFile),
    );
  });
  it('handle code files exports string correctly', async () => {
    const schemaFilePath = './fixtures/schema-str.js';
    const handler = new GraphQLHandler({
      name: 'SDLSchema',
      config: {
        source: schemaFilePath,
      },
      baseDir: __dirname,
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      store,
      importFn: defaultImportFn,
      logger,
    });
    const absoluteFilePath = join(__dirname, schemaFilePath);
    const schemaStringFromFile = require(absoluteFilePath);
    const schemaFromFile = buildSchema(schemaStringFromFile);
    const { schema: schemaFromHandler } = await handler.getMeshSource({
      fetchFn,
    });
    expect(introspectionFromSchema(schemaFromHandler)).toStrictEqual(
      introspectionFromSchema(schemaFromFile),
    );
  });
  it('should handle fallback, retry and timeout options', async () => {
    let cnt = 0;
    const server1 = createServer((req, res) => {
      if (cnt < 2) {
        const timeout = setTimeout(() => {
          res.writeHead(200);
          res.end(
            JSON.stringify({
              data: {
                hello: `Hello world from the first server at ${cnt}`,
              },
            }),
          );
        }, 1000);
        req.once('close', () => {
          clearTimeout(timeout);
        });
        cnt++;
      }
    });
    servers.add(server1);
    function socketListener(socket: Socket) {
      sockets.add(socket);
      socket.once('close', () => {
        sockets.delete(socket);
      });
    }
    server1.on('connection', socketListener);
    server1.listen(0);
    const server2 = createServer((req, res) => {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          data: {
            hello: `Hello world from the second server at ${cnt}`,
          },
        }),
      );
    });
    servers.add(server2);
    server2.on('connection', socketListener);
    server2.listen(0);

    const introspectionSchemaProxy = store.proxy(
      'introspectionSchema',
      PredefinedProxyOptions.GraphQLSchemaWithDiffing,
    );
    await introspectionSchemaProxy.set(
      buildSchema(/* GraphQL */ `
        type Query {
          hello: String!
        }
      `),
    );
    const handler = new GraphQLHandler({
      name: 'Test',
      config: {
        sources: [
          {
            endpoint: `http://localhost:${(server1.address() as AddressInfo).port}`,
            timeout: 500,
            retry: 3,
          },
          {
            endpoint: `http://localhost:${(server2.address() as AddressInfo).port}`,
            retry: 3,
          },
        ],
        strategy: 'fallback',
      },
      baseDir: __dirname,
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      store,
      importFn: defaultImportFn,
      logger,
    });
    const { schema, executor } = await handler.getMeshSource({
      fetchFn,
    });
    const printedSDL = printSchemaWithDirectives(schema);
    expect(printedSDL).toMatchInlineSnapshot(`
      "schema {
        query: Query
      }

      type Query {
        hello: String!
      }"
    `);
    const result = await executor({
      document: parse(/* GraphQL */ `
        query {
          hello
        }
      `),
    });
    expect(result).toEqual({
      data: {
        hello: 'Hello world from the second server at 2',
      },
    });
  });
});
