export { executor, getBackboneExecutorBySchema } from './executor.js';
export { defaultMergedResolver } from './defaultMergedResolver.js';
export { buildStitchPlan, coerceOperationVariables } from './buildStitchPlan.js';
export { executeStitchPlan } from './executeStitchPlan.js';
export { isLocalField } from './localFields.js';
export { projectDataToOperation } from './projectResult.js';
export {
  installRootProxyingResolvers,
  BACKBONE_EXECUTING,
  getOriginalRootResolve,
} from './rootProxyingResolvers.js';
export {
  type StitchPlan,
  type StitchPlanNode,
  type StitchPlanSchedule,
  type StitchRunIf,
  type StitchRunIfClause,
} from './types.js';
export { buildPlanSchedule, collectExecutableHops, planHasCondition } from './planSchedule.js';
export { flattenPlanControlFlow } from './planShape.js';
export { evaluateRunIf, flattenConditionsToRunIf, orRunIf } from './runIf.js';
