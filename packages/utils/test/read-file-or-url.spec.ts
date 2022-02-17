import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, relative } from 'path';
import { readFile } from '../src/read-file-or-url';
import { cwd } from 'process';

describe('readFile', () => {
  it('should convert relative paths to absolute paths correctly', async () => {
    const tmpFileAbsolutePath = join(tmpdir(), './tmpfile.json');
    const tmpFileContent = {
      test: 'TEST',
    };
    writeFileSync(tmpFileAbsolutePath, JSON.stringify(tmpFileContent));
    const tmpFileRelativePath = relative(cwd(), tmpFileAbsolutePath);
    const receivedFileContent = await readFile(tmpFileRelativePath);
    expect(receivedFileContent).toStrictEqual(tmpFileContent);
  });
  it('should respect absolute paths correctly', async () => {
    const tmpFileAbsolutePath = join(tmpdir(), './tmpfile.json');
    const tmpFileContent = {
      test: 'TEST',
    };
    writeFileSync(tmpFileAbsolutePath, JSON.stringify(tmpFileContent));
    const receivedFileContent = await readFile(tmpFileAbsolutePath);
    expect(receivedFileContent).toStrictEqual(tmpFileContent);
  });
});
