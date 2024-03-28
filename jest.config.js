const { resolve } = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');
const JSON5 = require('json5');
const CI = !!process.env.CI;
const { readFileSync } = require('fs');

const ROOT_DIR = __dirname;
const TSCONFIG = resolve(ROOT_DIR, 'tsconfig.json');
const tsconfigStr = readFileSync(TSCONFIG, 'utf8');
const tsconfig = JSON5.parse(tsconfigStr);

process.env.LC_ALL = 'en_US';

const testMatch = ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'];

if (process.env.LEAK_TEST) {
  testMatch.push('!**/examples/grpc-*/**');
  testMatch.push('!**/examples/sqlite-*/**');
  testMatch.push('!**/examples/mysql-*/**');
  testMatch.push('!**/examples/v1-next/grpc-*/**');
  testMatch.push('!**/examples/v1-next/sqlite-*/**');
  testMatch.push('!**/examples/v1-next/mysql-*/**');
}

testMatch.push(process.env.INTEGRATION_TEST ? '!**/packages/**' : '!**/examples/**');

testMatch.push(
  process.env.INTEGRATION_TEST
    ? '**/packages/**/__integration_tests__/**'
    : '!**/packages/**/__integration_tests__/**',
);

testMatch.push(
  process.env.INTEGRATION_TEST && !process.env.LEAK_TEST
    ? '**/packages/plugins/newrelic/tests/**'
    : '!**/packages/plugins/newrelic/tests/**',
);

if (process.version.startsWith('v21.')) {
  console.warn('Skipping SQLite Chinook tests because Node v21 is not supported yet');
  testMatch.push('!**/examples/sqlite-chinook/**');
}
const ESM_PACKAGES = ['prettier'];

module.exports = {
  testEnvironment: 'node',
  rootDir: ROOT_DIR,
  restoreMocks: true,
  reporters: ['default'],
  modulePathIgnorePatterns: ['dist', 'fixtures', '.bob'],
  moduleNameMapper: {
    '@graphql-mesh/cross-helpers': '<rootDir>/packages/cross-helpers/node.js',
    ...pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
      prefix: `${ROOT_DIR}/`,
    }),
    'formdata-node': '<rootDir>/node_modules/formdata-node/lib/cjs/index.js',
    prettier: '<rootDir>/node_modules/prettier/index.mjs',
  },
  collectCoverage: false,
  cacheDirectory: resolve(ROOT_DIR, `${CI ? '' : 'node_modules/'}.cache/jest`),
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.m?(t|j)s?$': 'babel-jest',
  },
  transformIgnorePatterns: [`node_modules/(?!(${ESM_PACKAGES.join('|')})/)`],
  resolver: 'bob-the-bundler/jest-resolver',
  testMatch,
};
