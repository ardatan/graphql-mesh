const { resolve } = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');
const JSON5 = require('json5');
const CI = !!process.env.CI;
const { readFileSync } = require('fs');
const { platform } = require('os');

const ROOT_DIR = __dirname;
const TSCONFIG = resolve(ROOT_DIR, 'tsconfig.json');
const tsconfigStr = readFileSync(TSCONFIG, 'utf8');
const tsconfig = JSON5.parse(tsconfigStr);

process.env.LC_ALL = 'en_US';

let displayName = 'Unit Tests';

if (process.env.E2E_TEST) {
  displayName = 'E2E Tests';
}
if (process.env.INTEGRATION_TEST) {
  displayName = 'Integration Tests';
}
if (process.env.LEAK_TEST) {
  displayName += ' (Leak Detection)';
}

let testMatch = ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'];
// Bun-native suites (`*.bun.test.ts`) run with `bun test`, not Jest/Node.
testMatch.push('!**/*.bun.test.ts');
testMatch.push('!**/bench/**');
testMatch.push('!**/*.bench.ts');

if (process.env.LEAK_TEST) {
  testMatch.push('!**/examples/grpc-reflection-example/**');
  testMatch.push('!**/examples/sqlite-*/**');
  testMatch.push('!**/examples/mongoose-*/**');
  testMatch.push('!**/examples/mysql-*/**');
  testMatch.push('!**/examples/v1-next/mysql-*/**');
  testMatch.push('!**/examples/federation-example/tests/polling.test.ts');
  // Imports grafast / @dataplan/pg (process-lifetime handles).
  testMatch.push('!**/packages/transports/sql/test/pg-registry.test.ts');
  testMatch.push('!**/packages/transports/sql/test/pg-plans.test.ts');
  // Large compose suites retain Apollo/federation process-lifetime handles.
  testMatch.push('!**/packages/fusion/composition/tests/mesh-join-supergraph.test.ts');
  testMatch.push('!**/packages/fusion/composition/tests/connectors.spec.ts');
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

if (process.env.E2E_TEST) {
  testMatch = ['**/e2e/**/?(*.)+(spec|test).[jt]s?(x)'];
} else {
  testMatch.push('!**/e2e/**/?(*.)+(spec|test).[jt]s?(x)');
}

const platformName = platform();
const isLinux = platformName === 'linux';
const isWindows = platformName === 'win32';

if (process.env.E2E_TEST && process.env.CI && !isLinux) {
  // TODO: containers are not starting on non-linux environments
  testMatch.push('!**/e2e/auto-type-merging/**');
  testMatch.push('!**/e2e/neo4j-example/**');
  testMatch.push('!**/e2e/soap-demo/**');
  testMatch.push('!**/e2e/mysql-employees/**');
  testMatch.push('!**/e2e/opentelemetry/**');
  if (isWindows) {
    testMatch.push('!**/e2e/tsconfig-paths/**');
    testMatch.push('!**/e2e/cjs-project/**');
  }
}

const ESM_PACKAGES = [
  '@neo4j/cypher-builder',
  '@graphql-codegen/typescript/node_modules/auto-bind',
  'auto-bind',
  'commander',
  '@commander-js/extra-typings',
  // executor-http (moved from Gateway) depends on ESM-only extract-files@14
  'extract-files',
  'is-plain-obj',
  // multipart e2es (defer/stream ports from Gateway)
  'meros',
];

/** @type {import('jest').Config} */
module.exports = {
  displayName,
  prettierPath: null, // not supported before Jest v30 https://github.com/jestjs/jest/issues/14305
  testEnvironment: 'node',
  rootDir: ROOT_DIR,
  restoreMocks: true,
  reporters: ['default'],
  verbose: !!process.env.DEBUG,
  modulePathIgnorePatterns: ['dist', 'fixtures', '.bob'],
  moduleNameMapper: {
    '@graphql-mesh/cross-helpers': '<rootDir>/packages/cross-helpers/node.js',
    // Packages still published outside this repo (Gateway plugins)
    '@graphql-mesh/hmac-upstream-signature':
      '<rootDir>/node_modules/@graphql-mesh/hmac-upstream-signature/dist/index.cjs',
    '@graphql-mesh/opentelemetry':
      '<rootDir>/node_modules/@graphql-mesh/opentelemetry/dist/index.cjs',
    '@graphql-mesh/plugin-prometheus':
      '<rootDir>/node_modules/@graphql-mesh/prometheus/dist/index.cjs',
    '@graphql-mesh/plugin-jwt-auth':
      '<rootDir>/node_modules/@graphql-mesh/plugin-jwt-auth/dist/index.cjs',
    // Hive audit package is dual-published; Jest needs the CJS entry (ESM pulls fets).
    '@graphql-hive/federation-gateway-audit':
      '<rootDir>/node_modules/@graphql-hive/federation-gateway-audit/dist/index.cjs',

    '^graphql$': '<rootDir>/node_modules/graphql/index.js',
    '^lru-cache$': '<rootDir>/node_modules/lru-cache/dist/commonjs/index.js',
    ...pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
      prefix: `${ROOT_DIR}/`,
      useESM: true,
    }),
    // Override tsconfig type stubs so Jest loads real packages at runtime.
    '^grafast$': '<rootDir>/node_modules/grafast/dist/index.js',
    '^@dataplan/pg$': '<rootDir>/node_modules/@dataplan/pg/dist/index.js',
    '^@dataplan/pg/adaptors/pg$': '<rootDir>/node_modules/@dataplan/pg/dist/adaptors/pg.js',
  },
  collectCoverage: false,
  cacheDirectory: resolve(ROOT_DIR, `${CI ? '' : 'node_modules/'}.cache/jest`),
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.m?(t|j)s?$': 'babel-jest',
  },
  transformIgnorePatterns: [`node_modules/(?!(${ESM_PACKAGES.join('|')})/)`],
  resolver: 'bob-the-bundler/jest-resolver',
  // One snap file for GraphQL 16+17: canonicalize printSchema* cosmetics.
  snapshotSerializers: ['<rootDir>/jest.sdl-snapshot-serializer.cjs'],
  testMatch,
  setupFilesAfterEnv: ['<rootDir>/setup-jest.js'],
};
