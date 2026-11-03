// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig, useHttpCache } from '@graphql-hive/gateway';

export const gatewayConfig = defineConfig({
  plugins: ctx => [
    // Gateway still peers older Yoga/Envelop majors than this repo; cast until gateway catches up.
    useHttpCache({
      ...ctx,
    }) as any,
  ],
});
