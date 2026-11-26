import type { StitchPlanNode, StitchPlanSchedule } from './types.js';

export type ScheduledHop =
  | Extract<StitchPlanNode, { kind: 'Fetch' }>
  | Extract<StitchPlanNode, { kind: 'BatchFetch' }>
  | Extract<StitchPlanNode, { kind: 'Island' }>;

function hopCompletesIds(hop: ScheduledHop): string[] {
  if (hop.completesIds?.length) {
    return hop.completesIds;
  }
  return hop.id ? [hop.id] : [];
}

function hopDependsOn(hop: ScheduledHop): string[] {
  return hop.dependsOn ?? [];
}

/**
 * Collect executable hops for one run. Prefer `runIf` (all hops stay in the
 * set; off hops no-op at execute). Legacy Condition keeps a single branch from
 * `variableValues`. Island is a hop; its continue is queued after.
 */
export function collectExecutableHops(
  node: StitchPlanNode,
  out: ScheduledHop[],
  variableValues: Record<string, any>,
): void {
  if (node.kind === 'Fetch' || node.kind === 'BatchFetch' || node.kind === 'Island') {
    out.push(node);
    if (node.kind === 'Island' && node.continue) {
      collectExecutableHops(node.continue, out, variableValues);
    }
    return;
  }
  if (node.kind === 'Condition') {
    const taken = variableValues?.[node.condition] === true ? node.ifClause : node.elseClause;
    if (taken) {
      collectExecutableHops(taken, out, variableValues);
    }
    return;
  }
  if (node.kind === 'Sequence' || node.kind === 'Parallel') {
    for (const child of node.nodes) {
      collectExecutableHops(child, out, variableValues);
    }
  }
}

export function planHasCondition(node: StitchPlanNode): boolean {
  if (node.kind === 'Condition') {
    return true;
  }
  if (node.kind === 'Island' && node.continue) {
    return planHasCondition(node.continue);
  }
  if (node.kind === 'Sequence' || node.kind === 'Parallel') {
    return node.nodes.some(planHasCondition);
  }
  return false;
}

/**
 * In-degree schedule for a hop list (same order as {@link collectExecutableHops}).
 * Refuses cycles and dependsOn ids that no hop completes.
 */
export function buildPlanSchedule(hops: ScheduledHop[]): StitchPlanSchedule {
  const n = hops.length;
  const idOwner = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    for (const id of hopCompletesIds(hops[i]!)) {
      if (idOwner.has(id)) {
        throw new Error(`Stitch plan duplicate completes id: ${id}`);
      }
      idOwner.set(id, i);
    }
  }

  const waits = new Array<number>(n).fill(0);
  const dependents: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const preds = new Set<number>();
    for (const dep of hopDependsOn(hops[i]!)) {
      const j = idOwner.get(dep);
      if (j == null) {
        throw new Error(
          `Stitch plan hop ${hopCompletesIds(hops[i]!).join(',')} depends on unknown id ${dep}`,
        );
      }
      if (j === i) {
        throw new Error(`Stitch plan hop depends on itself (${dep}); schedule would cycle`);
      }
      preds.add(j);
    }
    waits[i] = preds.size;
    for (const j of preds) {
      dependents[j]!.push(i);
    }
  }

  // Kahn check: every hop reachable from zero-wait seeds.
  const remaining = waits.slice();
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (remaining[i] === 0) {
      queue.push(i);
    }
  }
  let seen = 0;
  while (queue.length) {
    const i = queue.pop()!;
    seen++;
    for (const d of dependents[i]!) {
      remaining[d]!--;
      if (remaining[d] === 0) {
        queue.push(d);
      }
    }
  }
  if (seen !== n) {
    throw new Error('Stitch plan schedule has a cycle');
  }

  return { waits, dependents };
}

/** Copy initial waits for a single execution (mutated as hops complete). */
export function freshWaits(schedule: StitchPlanSchedule): number[] {
  return schedule.waits.slice();
}
