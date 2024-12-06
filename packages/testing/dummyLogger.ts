import type { Logger } from '@graphql-mesh/types';

export const dummyLogger: jest.Mocked<Logger> = {
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: (() => dummyLogger) as any,
};
