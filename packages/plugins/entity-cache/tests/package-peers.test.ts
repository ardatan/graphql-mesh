import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from '@jest/globals';

const { satisfies } = createRequire(__filename)('semver') as {
  satisfies(version: string, range: string): boolean;
};
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));
// #9658: compatible consumer patches share peers; tests still use exact dev inputs.
describe('portable entity-cache peer contract (#9658)', () => {
  it.each([
    ['graphql', '16.14.1', '17.0.0'],
    ['@graphql-tools/utils', '12.0.5', '13.0.0'],
    ['ioredis', '5.11.2', '6.0.0'],
    ['@graphql-hive/gateway-runtime', '2.10.8', '3.0.0'],
  ])(
    'accepts compatible patches and rejects unsupported majors for %s',
    (name, compatible, major) => {
      const range = pkg.peerDependencies[name];
      expect(typeof range).toBe('string');
      expect(satisfies(compatible, range)).toBe(true);
      expect(satisfies(major, range)).toBe(false);
    },
  );
  it('keeps exact tested versions in development dependencies', () => {
    for (const [name, version] of Object.entries({
      graphql: '16.14.0',
      '@graphql-tools/utils': '12.0.4',
      ioredis: '5.11.1',
      '@graphql-hive/gateway-runtime': '2.10.7',
    }))
      expect(pkg.devDependencies[name]).toBe(version);
  });
});
