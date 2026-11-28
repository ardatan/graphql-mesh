import { buildSubgraphSchema } from '@apollo/subgraph';
import { accounts, inventory, products, reviews } from './services';
import { composeLocalSchemasWithApollo } from '../../helpers';
import { DocumentNode, GraphQLSchema } from 'graphql';

const services = {
  accounts,
  inventory,
  products,
  reviews,
} as const;

export interface ServiceInput {
  name: string;
  typeDefs: DocumentNode;
  schema: GraphQLSchema;
}

export function getServiceInputs() {
  return Object.entries(services).map(([name, module]) => ({
    name,
    typeDefs: module.typeDefs,
    // Prefer the prebuilt subgraph schema from each service module.
    // `buildSubgraphSchema(module)` fails under Mesh's Apollo Subgraph
    // (extra `schema`/`server` keys); array form matches other Mesh fixtures.
    schema: module.schema ?? buildSubgraphSchema([{ typeDefs: module.typeDefs, resolvers: module.resolvers }]),
  }));
}

export async function getSupergraph() {
  return composeLocalSchemasWithApollo(getServiceInputs());
}
