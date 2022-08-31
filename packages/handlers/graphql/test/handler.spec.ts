/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-nodejs-modules */
import InMemoryLRUCache from '@graphql-mesh/cache-localforage';
import GraphQLHandler from '../src';
import { PubSub, defaultImportFn, DefaultLogger } from '@graphql-mesh/utils';
import { promises as fsPromises } from 'fs';
import { join } from 'path';
import { buildASTSchema, buildSchema, introspectionFromSchema } from 'graphql';
import { InMemoryStoreStorageAdapter, MeshStore } from '@graphql-mesh/store';
import { fetch as fetchFn } from '@whatwg-node/fetch';

const { readFile } = fsPromises;

const logger = new DefaultLogger('tests');

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
        schema: sdlFilePath,
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
        schema: schemaFilePath,
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
        schema: schemaFilePath,
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
        schema: schemaFilePath,
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
    expect(introspectionFromSchema(schemaFromHandler)).toStrictEqual(introspectionFromSchema(schemaFromFile));
  });
});
