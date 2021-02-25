const { resolve } = require('path');
const { pathsToModuleNameMapper } = require('ts-jest/utils');
const CI = !!process.env.CI;

const ROOT_DIR = __dirname;
const TSCONFIG = resolve(ROOT_DIR, 'tsconfig.json');
const tsconfig = require(TSCONFIG);

module.exports = {
  transform: { '^.+\\.tsx?$': 'ts-jest', '^.+\\.jsx?$': 'babel-jest' },
  testEnvironment: 'node',
  rootDir: ROOT_DIR,
  globals: {
    'ts-jest': {
      diagnostics: false,
      tsconfig: TSCONFIG,
      babelConfig: true,
    },
  },
  restoreMocks: true,
  reporters: ['default'],
  modulePathIgnorePatterns: ['dist'],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, { prefix: `${ROOT_DIR}/` }),
  collectCoverage: false,
  cacheDirectory: resolve(ROOT_DIR, `${CI ? '' : 'node_modules/'}.cache/jest`),
};
