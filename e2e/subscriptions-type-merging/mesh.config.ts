import { Opts } from '@e2e/opts';
import { defineConfig, loadGraphQLHTTPSubgraph } from '@graphql-mesh/compose-cli';

const opts = Opts(process.argv);

export const composeConfig = defineConfig({
  subgraphs: [
    {
      sourceHandler: loadGraphQLHTTPSubgraph('products', {
        endpoint: `http://localhost:${opts.getServicePort('products')}/graphql`,
      }),
    },
  ],
  additionalTypeDefs: /* GraphQL */ `
    extend schema {
      subscription: Subscription
    }
    type Subscription {
      newProduct: Product! @resolveTo(pubsubTopic: "new_product")
    }
  `,
});
