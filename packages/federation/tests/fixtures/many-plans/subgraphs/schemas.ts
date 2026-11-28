import { readFileSync } from 'fs';
import { join } from 'path';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLSchema, parse } from 'graphql';

const typeDefs: string[] = [];
for (let i = 0; i < 7; i++) {
  typeDefs.push(readFileSync(join(__dirname, `subgraph${i}.graphql`), 'utf-8'));
}
function createNode() {
  return {
    id0: `id1-0`,
    f0: 'f0-0',
    f1: 'f1-0',
    f2: 'f2-0',
    f3: 'f3-0',
    f4: 'f4-0',
    f5: 'f5-0',
    f6: 'f6-0',
  };
}
const resolvers = {
  Query: {
    node() {
      return createNode();
    },
  },
  Node: {
    __resolveReference(reference: { id0: string }) {
      return {
        ...createNode(),
        id0: reference.id0,
      };
    },
    n0: () => createNode(),
    n1: () => createNode(),
    n2: () => createNode(),
    n3: () => createNode(),
    n4: () => createNode(),
    n5: () => createNode(),
    n6: () => createNode(),
  },
};
export const schemas: GraphQLSchema[] = typeDefs.map((typeDef) =>
  buildSubgraphSchema([{ typeDefs: parse(typeDef), resolvers }]),
);
