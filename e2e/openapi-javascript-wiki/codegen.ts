import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './supergraph.graphql',
  generates: {
    './types/incontext-sdk.ts': {
      plugins: ['@graphql-mesh/incontext-sdk-codegen'],
    },
  },
};

export default config;
