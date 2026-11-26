export {
  attachBackboneExecutor,
  BACKBONE_EXECUTOR_EXTENSION,
  getBackboneExecutor,
  markChangedRootResolvesAsLocal,
  resolveBackboneExecutorOptions,
  snapshotRootFieldResolves,
} from './attachBackboneExecutor.js';
export { defaultMergedResolver } from './defaultMergedResolver.js';
export { buildStitchPlan } from './buildStitchPlan.js';
export { createBackboneExecutor } from './createBackboneExecutor.js';
export { executeStitchPlan } from './executeStitchPlan.js';
export { isLocalField } from './localFields.js';
export { projectDataToOperation } from './projectResult.js';
export {
  BACKBONE_EXECUTING,
  getOriginalRootResolve,
  installRootProxyingResolvers,
} from './rootProxyingResolvers.js';
export {
  BACKBONE_EXECUTOR_OPTIONS_EXTENSION,
  type BackboneExecutorOptions,
  type BuildStitchPlanOptions,
  type StitchPlan,
  type StitchPlanNode,
  type StitchPlanSchedule,
  type StitchRunIf,
  type StitchRunIfClause,
} from './types.js';
export { buildPlanSchedule, collectExecutableHops, planHasCondition } from './planSchedule.js';
export { flattenPlanControlFlow } from './planShape.js';
export { evaluateRunIf, flattenConditionsToRunIf, orRunIf } from './runIf.js';
