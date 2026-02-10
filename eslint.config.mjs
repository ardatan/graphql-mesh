import { defineConfig } from 'eslint/config';
import { FlatCompat } from '@eslint/eslintrc';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

const compat = new FlatCompat({
  baseDirectory: process.cwd(),
  recommendedConfig: {},
});

export default defineConfig([
  ...compat.extends(
    'eslint:recommended',
    'standard',
    'prettier',
    'plugin:@typescript-eslint/recommended',
  ),
  {
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        projectService: true,
      },
      globals: {
        BigInt: true,
        es6: true,
        node: true,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslintPlugin,
    },
    rules: {
      'no-empty': 'off',
      'no-console': 'off',
      'no-prototype-builtins': 'off',
      'no-useless-constructor': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-ignore': 'off',
      '@typescript-eslint/return-await': 'error',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',
      'import/no-nodejs-modules': 'error',
      'no-eval': 'off',
      'no-use-before-define': 'off',
      'no-template-curly-in-string': 'off',
      '@typescript-eslint/consistent-type-exports': [
        'error',
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports',
        },
      ],
      'import/no-extraneous-dependencies': [
        'error',
        { devDependencies: ['**/*.test.ts', '**/*.spec.ts'] },
      ],
    },
    ignores: ['dist', 'node_modules', 'examples', 'website', 'scripts', '.bob', 'config-schema.ts'],
  },
  {
    files: ['**/test/**/*.{ts,js}', '*.spec.ts'],
    languageOptions: {
      globals: {
        jest: true,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['e2e/**/*'],
    rules: {
      'import/no-nodejs-modules': 'off',
    },
  },
]);
