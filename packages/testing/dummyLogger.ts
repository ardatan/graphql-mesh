import type { Logger } from '@graphql-hive/logger';

export const dummyLogger = {
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: () => dummyLogger,
  setLevel: jest.fn(),
  flush: jest.fn(),
  write: jest.fn(),
  trace: jest.fn(),
} as unknown as Logger & {
  log: jest.Mock;
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
};
