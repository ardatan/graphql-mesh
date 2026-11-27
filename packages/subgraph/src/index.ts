export { buildSubgraphSchema } from './buildSubgraphSchema.js';
export type {
  BuildSubgraphSchemaInput,
  BuildSubgraphSchemaOptions,
} from './buildSubgraphSchema.js';
export { wireLookupEntityResolvers } from './lookup.js';
export { collectEntityObjectTypes, wireResolveReferenceFromResolvers } from './entities.js';
export { ensureFederationEntitiesField, ensureFederationServiceField } from './federation-root.js';
export {
  applyMeshSourceTransforms,
  extractMeshSourceTransforms,
  getMeshSourceDirectiveName,
  schemaHasMeshSourceTransforms,
} from './source-transforms.js';
export { wirePubSubDirectives } from './pubsub.js';
