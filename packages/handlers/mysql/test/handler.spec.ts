import MySQLHandler from '../src';
import { createPool } from 'mysql';
import { YamlConfig } from '@graphql-mesh/types';

const pubsubMock = { mock: 'pubsub' } as any;
const nameMock = 'MySQLHandler';
const cacheMock = { mock: 'cache' } as any;

jest.mock('mysql');

describe('mysql', () => {
  describe('constructor()', () => {
    describe('correctly initializes parameters when', () => {
      it('the config is contains pool', () => {
        const configMock = {
          pool: { mock: 'pool' } as any,
        };

        const mysqlHandler = new MySQLHandler({
          cache: cacheMock,
          pubsub: pubsubMock,
          name: nameMock,
          config: configMock,
        });

        expect(mysqlHandler['poolConfig']).toEqual({});
        expect(mysqlHandler['pool']).toBe(configMock.pool);
        expect(mysqlHandler['pubsub']).toBe(pubsubMock);
      });

      it('the config contains poolConfig', () => {
        const configMock: YamlConfig.MySQLHandler = {
          database: 'test',
          host: '2',
          port: 3,
          user: 'max',
        };

        const mysqlHandler = new MySQLHandler({
          cache: cacheMock,
          pubsub: pubsubMock,
          name: nameMock,
          config: configMock,
        });

        expect(mysqlHandler['poolConfig']).toEqual(configMock);
        expect(mysqlHandler['pool']).toBe(undefined);
        expect(mysqlHandler['pubsub']).toBe(pubsubMock);
      });
    });
  });

  describe('buildPool()', () => {
    afterAll(() => {
      jest.restoreAllMocks();
    });
    it('returns the existing pool if there is any', () => {
      const configMock = {
        pool: { mock: 'pool' } as any,
      };

      const mysqlHandler = new MySQLHandler({
        cache: cacheMock,
        pubsub: pubsubMock,
        name: nameMock,
        config: configMock,
      });

      expect(mysqlHandler['buildPool']()).toBe(configMock.pool);
    });

    it('creates and returns a new pool if there is no existing one', () => {
      const configMock: YamlConfig.MySQLHandler = {
        database: 'test',
        host: '2',
        port: 3,
        user: 'max',
      };

      const mysqlHandler = new MySQLHandler({
        cache: cacheMock,
        pubsub: pubsubMock,
        name: nameMock,
        config: configMock,
      });

      const fakelyCreatedPool = {} as any;

      (createPool as jest.Mock).mockImplementation(() => fakelyCreatedPool);

      const returnedPool = mysqlHandler['buildPool']();

      expect(createPool).toHaveBeenCalledTimes(1);
      expect(createPool).toHaveBeenCalledWith(configMock);
      expect(returnedPool).toEqual(fakelyCreatedPool);
    });
  });
});
