export { buildSubgraphSchema } from './buildSubgraphSchema.js';
export type {
  BuildSubgraphSchemaInput,
  BuildSubgraphSchemaOptions,
  BuildSubgraphSchemaTypeDefs,
  BuildSubgraphTypeDefs,
  GraphQLSchemaModule,
} from './buildSubgraphSchema.js';
export { wireLookupEntityResolvers } from './lookup.js';
export { collectEntityObjectTypes, wireResolveReferenceFromResolvers } from './entities.js';
export { ensureFederationEntitiesField, ensureFederationServiceField } from './federation-root.js';
export {
  applyMeshSourceTransforms,
  extractMeshSourceTransforms,
  getApolloConnectorsSourceDirectiveName,
  getMeshSourceDirectiveName,
  isApolloConnectorsSpecUrl,
  schemaHasMeshSourceTransforms,
} from './source-transforms.js';
export { wirePubSubDirectives } from './pubsub.js';
