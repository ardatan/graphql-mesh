import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'graphql';
import { createYoga } from 'graphql-yoga';
import { buildSubgraphSchema } from '@apollo/subgraph';

export const DEMO_FEATURES = createYoga({
  schema: buildSubgraphSchema({
    typeDefs: parse(readFileSync(join(__dirname, 'DEMO_FEATURES.graphql'), 'utf-8')),
    resolvers: {
      Query: {
        demoMe: () => ({
          role: 'USER',
          spaceId: 'demo_space',
          userId: 'demo_user',
        }),
        demoFeatures: () => ({
          edges: [
            {
              node: {
                id: 'demo',
                name: 'Demo_feature',
                description: 'Demo_feature_description',
                publicId: 'demo_public_id',
              },
            },
          ],
        }),
      },
    },
  }),
});
