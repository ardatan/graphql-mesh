import { chmodSync, mkdirSync, mkdtempSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensurePrivateTuqlCacheDir } from '../src/index.js';

describe('ensurePrivateTuqlCacheDir', () => {
  it('rejects a symlink cache path without chmodding the target', () => {
    const base = mkdtempSync(join(tmpdir(), 'tuql-cache-test-'));
    const target = join(base, 'target');
    const link = join(base, 'link');
    mkdirSync(target, { mode: 0o755 });
    chmodSync(target, 0o755);
    symlinkSync(target, link, 'dir');

    expect(() => ensurePrivateTuqlCacheDir(link)).toThrow(/must not be a symlink/);

    // Target mode must stay as set (chmod must not follow the link).
    expect(statSync(target).mode & 0o777).toBe(0o755);
  });

  it('hardens a real owned directory to 0o700', () => {
    const base = mkdtempSync(join(tmpdir(), 'tuql-cache-ok-'));
    chmodSync(base, 0o755);
    const out = ensurePrivateTuqlCacheDir(base);
    expect(out).toBe(base);
    expect(statSync(base).mode & 0o777).toBe(0o700);
  });

  it('rejects a non-directory path', () => {
    const base = mkdtempSync(join(tmpdir(), 'tuql-cache-file-'));
    const file = join(base, 'not-a-dir');
    writeFileSync(file, 'x');
    expect(() => ensurePrivateTuqlCacheDir(file)).toThrow(/not a directory/);
  });
});
