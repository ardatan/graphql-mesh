import type { StitchPlanNode } from './types.js';

/**
 * Collapse Sequence/Parallel into a flat bag. Execution ignores tree barriers;
 * dependsOn already encodes order. Condition and Island.continue stay nested.
 */
export function flattenPlanControlFlow(node: StitchPlanNode): StitchPlanNode {
  if (node.kind === 'Sequence' || node.kind === 'Parallel') {
    const flat: StitchPlanNode[] = [];
    for (const child of node.nodes) {
      const next = flattenPlanControlFlow(child);
      if (next.kind === 'Sequence' || next.kind === 'Parallel') {
        flat.push(...next.nodes);
      } else {
        flat.push(next);
      }
    }
    if (flat.length === 0) {
      return { kind: 'Parallel', nodes: [] };
    }
    if (flat.length === 1) {
      return flat[0]!;
    }
    return { kind: 'Parallel', nodes: flat };
  }
  if (node.kind === 'Condition') {
    return {
      ...node,
      ifClause: node.ifClause ? flattenPlanControlFlow(node.ifClause) : undefined,
      elseClause: node.elseClause ? flattenPlanControlFlow(node.elseClause) : undefined,
    };
  }
  if (node.kind === 'Island') {
    return {
      ...node,
      continue: node.continue ? flattenPlanControlFlow(node.continue) : undefined,
    };
  }
  return node;
}

/** True when the node (or a descendant bag) is still Sequence. */
export function planHasSequence(node: StitchPlanNode): boolean {
  if (node.kind === 'Sequence') {
    return true;
  }
  if (node.kind === 'Parallel') {
    return node.nodes.some(planHasSequence);
  }
  if (node.kind === 'Condition') {
    return (
      (node.ifClause != null && planHasSequence(node.ifClause)) ||
      (node.elseClause != null && planHasSequence(node.elseClause))
    );
  }
  if (node.kind === 'Island' && node.continue) {
    return planHasSequence(node.continue);
  }
  return false;
}
