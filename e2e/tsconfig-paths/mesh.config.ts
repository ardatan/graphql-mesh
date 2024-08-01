// @ts-expect-error
import { schema } from '@e2e/tsconfig-paths/schema';
import { defineConfig } from '@graphql-mesh/compose-cli';

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: () => ({
        name: 'helloworld',
        schema$: schema,
      }),
    },
  ],
});
