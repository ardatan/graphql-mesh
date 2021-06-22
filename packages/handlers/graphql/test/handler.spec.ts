import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import GraphQLHandler from '../src';
import { PubSub } from 'graphql-subscriptions';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { buildASTSchema, buildSchema, introspectionFromSchema } from 'graphql';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';

const { readFile } = fsPromises;

describe('graphql', () => {
  it('handle SDL files correctly as endpoint', async () => {
    const sdlFilePath = './fixtures/schema.graphql';
    const store = new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
    const handler = new GraphQLHandler({
      name: 'SDLSchema',
      config: {
        endpoint: sdlFilePath,
      },
      baseDir: __dirname,
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      store,
    });
    const absoluteFilePath = join(__dirname, sdlFilePath);
    const schemaStringFromFile = await readFile(absoluteFilePath, 'utf-8');
    const schemaFromFile = buildSchema(schemaStringFromFile);
    const { schema: schemaFromHandler } = await handler.getMeshSource();
    expect(introspectionFromSchema(schemaFromHandler)).toStrictEqual(introspectionFromSchema(schemaFromFile));
  });
  it('handle code files exports GraphQLSchema correctly', async () => {
    const schemaFilePath = './fixtures/schema.js';
    const store = new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
    const handler = new GraphQLHandler({
      name: 'SDLSchema',
      config: {
        endpoint: schemaFilePath,
      },
      baseDir: __dirname,
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      store,
    });
    const absoluteFilePath = join(__dirname, schemaFilePath);
    const schemaFromFile = require(absoluteFilePath);
    const { schema: schemaFromHandler } = await handler.getMeshSource();
    expect(introspectionFromSchema(schemaFromHandler)).toStrictEqual(introspectionFromSchema(schemaFromFile));
  });
  it('handle code files exports DocumentNode correctly', async () => {
    const schemaFilePath = './fixtures/schema-document.js';
    const store = new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
    const handler = new GraphQLHandler({
      name: 'SDLSchema',
      config: {
        endpoint: schemaFilePath,
      },
      baseDir: __dirname,
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      store,
    });
    const absoluteFilePath = join(__dirname, schemaFilePath);
    const schemaDocumentFromFile = require(absoluteFilePath);
    const schemaFromFile = buildASTSchema(schemaDocumentFromFile);
    const { schema: schemaFromHandler } = await handler.getMeshSource();
    expect(introspectionFromSchema(schemaFromHandler)).toStrictEqual(introspectionFromSchema(schemaFromFile));
  });
  it('handle code files exports string correctly', async () => {
    const schemaFilePath = './fixtures/schema-str.js';
    const store = new MeshStore('.mesh', new InMemoryStoreStorageAdapter(), {
      readonly: false,
      validate: false,
    });
    const handler = new GraphQLHandler({
      name: 'SDLSchema',
      config: {
        endpoint: schemaFilePath,
      },
      baseDir: __dirname,
      cache: new InMemoryLRUCache(),
      pubsub: new PubSub(),
      store,
    });
    const absoluteFilePath = join(__dirname, schemaFilePath);
    const schemaStringFromFile = require(absoluteFilePath);
    const schemaFromFile = buildSchema(schemaStringFromFile);
    const { schema: schemaFromHandler } = await handler.getMeshSource();
    expect(introspectionFromSchema(schemaFromHandler)).toStrictEqual(introspectionFromSchema(schemaFromFile));
  });
});
