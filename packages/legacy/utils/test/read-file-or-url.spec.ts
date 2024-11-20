import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, relative } from 'path';
import type { Logger } from '@graphql-mesh/types';
import { fetch } from '@whatwg-node/fetch';
import { DefaultLogger } from '../src/logger.js';
import { readFile } from '../src/read-file-or-url.js';

describe('readFile', () => {
  const logger: Logger = {
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: () => logger,
  };
  it('should convert relative paths to absolute paths correctly', async () => {
    const tmpFileAbsolutePath = join(tmpdir(), './tmpfile.json');
    const tmpFileContent = {
      test: 'TEST',
    };
    writeFileSync(tmpFileAbsolutePath, JSON.stringify(tmpFileContent));
    const tmpFileRelativePath = relative(process.cwd(), tmpFileAbsolutePath);
    const receivedFileContent = await readFile(tmpFileRelativePath, {
      cwd: process.cwd(),
      fetch,

      logger,
      importFn: m => import(m),
    });
    expect(receivedFileContent).toStrictEqual(tmpFileContent);
  });
  it('should respect absolute paths correctly', async () => {
    const tmpFileAbsolutePath = join(tmpdir(), './tmpfile.json');
    const tmpFileContent = {
      test: 'TEST',
    };
    writeFileSync(tmpFileAbsolutePath, JSON.stringify(tmpFileContent));
    const receivedFileContent = await readFile(tmpFileAbsolutePath, {
      cwd: process.cwd(),
      fetch,

      logger,
      importFn: m => import(m),
    });
    expect(receivedFileContent).toStrictEqual(tmpFileContent);
  });
});
