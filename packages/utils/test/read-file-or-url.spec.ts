import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import InMemoryLRUCache from '@graphql-mesh/cache-inmemory-lru';
import { join, relative } from 'path';
import { readFile } from '../src/read-file-or-url';
import { cwd } from 'process';

describe('readFile', () => {
  it('should convert relative paths to absolute paths correctly', async () => {
    const cache = new InMemoryLRUCache();
    const tmpFileAbsolutePath = join(tmpdir(), './tmpfile.json');
    const tmpFileContent = {
      test: 'TEST',
    };
    writeFileSync(tmpFileAbsolutePath, JSON.stringify(tmpFileContent));
    const tmpFileRelativePath = relative(cwd(), tmpFileAbsolutePath);
    const receivedFileContent = await readFile(tmpFileRelativePath, cache);
    expect(receivedFileContent).toStrictEqual(tmpFileContent);
  });
  it('should respect absolute paths correctly', async () => {
    const cache = new InMemoryLRUCache();
    const tmpFileAbsolutePath = join(tmpdir(), './tmpfile.json');
    const tmpFileContent = {
      test: 'TEST',
    };
    writeFileSync(tmpFileAbsolutePath, JSON.stringify(tmpFileContent));
    const receivedFileContent = await readFile(tmpFileAbsolutePath, cache);
    expect(receivedFileContent).toStrictEqual(tmpFileContent);
  });
});
