import { valueFromASTUntyped, type OperationDefinitionNode } from 'graphql';
import type { StitchPlanNode, StitchRunIf, StitchRunIfClause } from './types.js';

/**
 * Operation variable defaults from the document AST (plan-time). Execute fills
 * a missing name into the live `variableValues` map on first read.
 */
export function collectVariableDefaults(
  operation: OperationDefinitionNode,
): Record<string, any> | undefined {
  let defaults: Record<string, any> | undefined;
  for (const def of operation.variableDefinitions ?? []) {
    if (def.defaultValue == null) {
      continue;
    }
    if (!defaults) {
      defaults = {};
    }
    const name = def.variable.name.value;
    defaults[name] = valueFromASTUntyped(def.defaultValue, defaults);
  }
  return defaults;
}

/**
 * Resolve one variable, writing a plan default into `variableValues` once when
 * the name is missing/undefined. Drops lingering `undefined` entries (Yoga).
 */
export function ensureVariableValue(
  variableValues: Record<string, any>,
  name: string,
  defaults?: Record<string, any>,
): any {
  if (variableValues[name] !== undefined) {
    return variableValues[name];
  }
  const fallback = defaults?.[name];
  if (fallback !== undefined) {
    variableValues[name] = fallback;
    return fallback;
  }
  if (name in variableValues) {
    delete variableValues[name];
  }
  return undefined;
}

/**
 * Sentinel AND-group that never matches variable values. Used when
 * simplification collapses to a contradiction (e.g. `v=true` AND `v=false`).
 * Distinct from an absent gate (`undefined`), which means always runnable.
 */
const NEVER_RUN_IF_CLAUSE: StitchRunIfClause = {
  variable: '\0never',
  equals: true,
};

/** DNF that never evaluates to true. */
export function neverRunIf(): StitchRunIf {
  return [[NEVER_RUN_IF_CLAUSE]];
}

export function isNeverRunIf(runIf: StitchRunIf | StitchRunIfClause[] | undefined): boolean {
  const dnf = asRunIfDnf(runIf);
  return (
    dnf?.length === 1 &&
    dnf[0]!.length === 1 &&
    dnf[0]![0]!.variable === NEVER_RUN_IF_CLAUSE.variable
  );
}

/** Normalize legacy AND-list or DNF into DNF (`OR` of `AND` groups). */
export function asRunIfDnf(
  runIf: StitchRunIf | StitchRunIfClause[] | undefined,
): StitchRunIf | undefined {
  if (runIf == null || (Array.isArray(runIf) && runIf.length === 0)) {
    return undefined;
  }
  // Already DNF: first element is an array of clauses
  if (Array.isArray(runIf[0])) {
    return runIf as StitchRunIf;
  }
  // Legacy AND-list of clauses
  return [runIf as StitchRunIfClause[]];
}

/** Stable key so coalescing does not merge hops with different gates. */
export function runIfKey(runIf: StitchRunIf | StitchRunIfClause[] | undefined): string {
  const dnf = asRunIfDnf(runIf);
  if (!dnf?.length) {
    return '';
  }
  return dnf
    .map(and =>
      and
        .map(c => `${c.variable}=${c.equals ? '1' : '0'}`)
        .sort()
        .join('&'),
    )
    .sort()
    .join('|');
}

/** AND of two DNF expressions (distribute). */
export function andRunIf(
  a: StitchRunIf | StitchRunIfClause[] | undefined,
  b: StitchRunIf | StitchRunIfClause[] | undefined,
): StitchRunIf | undefined {
  if (isNeverRunIf(a) || isNeverRunIf(b)) {
    return neverRunIf();
  }
  const left = asRunIfDnf(a);
  const right = asRunIfDnf(b);
  if (!left?.length) {
    return right;
  }
  if (!right?.length) {
    return left;
  }
  const out: StitchRunIf = [];
  for (const l of left) {
    for (const r of right) {
      const merged = andClauseLists(l, r);
      if (merged) {
        out.push(merged);
      }
    }
  }
  // Every AND-group contradicted → never, not ungated.
  if (!out.length) {
    return neverRunIf();
  }
  return simplifyRunIf(out);
}

/** OR of two DNF expressions. */
export function orRunIf(
  a: StitchRunIf | StitchRunIfClause[] | undefined,
  b: StitchRunIf | StitchRunIfClause[] | undefined,
): StitchRunIf | undefined {
  // Absent gate = always. always OR x = always.
  if (a == null || (Array.isArray(a) && a.length === 0)) {
    return undefined;
  }
  if (b == null || (Array.isArray(b) && b.length === 0)) {
    return undefined;
  }
  if (isNeverRunIf(a)) {
    return asRunIfDnf(b);
  }
  if (isNeverRunIf(b)) {
    return asRunIfDnf(a);
  }
  const left = asRunIfDnf(a) ?? [];
  const right = asRunIfDnf(b) ?? [];
  return simplifyRunIf([...left, ...right]);
}

/** Stamp/merge: AND (nested @skip/@include stack). */
export function mergeRunIf(
  a: StitchRunIf | StitchRunIfClause[] | undefined,
  b: StitchRunIf | StitchRunIfClause[] | undefined,
): StitchRunIf | undefined {
  return andRunIf(a, b);
}

function andClauseLists(
  a: StitchRunIfClause[],
  b: StitchRunIfClause[],
): StitchRunIfClause[] | null {
  const byVar = new Map<string, boolean>();
  for (const c of [...a, ...b]) {
    const prev = byVar.get(c.variable);
    if (prev !== undefined && prev !== c.equals) {
      return null; // contradiction → this AND-group never runs
    }
    byVar.set(c.variable, c.equals);
  }
  return [...byVar.entries()].map(([variable, equals]) => ({
    variable,
    equals,
  }));
}

/**
 * Drop empty/duplicate groups; if any group is empty AND (always), whole expr
 * is always. If ($v=true) OR ($v=false) for same-only var, tautology → always.
 * An empty input DNF (no surviving AND-groups) is never, not ungated.
 */
export function simplifyRunIf(dnf: StitchRunIf | undefined): StitchRunIf | undefined {
  if (dnf == null) {
    return undefined;
  }
  if (!dnf.length) {
    return neverRunIf();
  }
  const uniq = new Map<string, StitchRunIfClause[]>();
  for (const and of dnf) {
    if (!and.length) {
      // Empty AND = always → whole OR is always
      return undefined;
    }
    const key = and
      .map(c => `${c.variable}=${c.equals ? '1' : '0'}`)
      .sort()
      .join('&');
    uniq.set(key, and);
  }
  const groups = [...uniq.values()];
  // Single-var complementary pairs: (v=1) OR (v=0) → always
  if (groups.length === 2) {
    const [a, b] = groups;
    if (
      a!.length === 1 &&
      b!.length === 1 &&
      a![0]!.variable === b![0]!.variable &&
      a![0]!.equals !== b![0]!.equals
    ) {
      return undefined;
    }
  }
  return groups;
}

/** True when any AND-group fully matches (missing runIf => always). */
export function evaluateRunIf(
  runIf: StitchRunIf | StitchRunIfClause[] | undefined,
  variableValues: Record<string, any> | undefined,
  variableDefaults?: Record<string, any>,
): boolean {
  const dnf = asRunIfDnf(runIf);
  if (!dnf?.length) {
    return true;
  }
  const vars = variableValues ?? {};
  for (const and of dnf) {
    let ok = true;
    for (const c of and) {
      const value = ensureVariableValue(vars, c.variable, variableDefaults);
      if ((value === true) !== c.equals) {
        ok = false;
        break;
      }
    }
    if (ok) {
      return true;
    }
  }
  return false;
}

/**
 * Stamp additional `runIf` clauses (AND) onto every executable hop under `node`.
 * BatchFetch aliases inherit the same clauses (per-alias gates for batching).
 */
export function stampRunIf(node: StitchPlanNode, extra: StitchRunIfClause[]): StitchPlanNode {
  if (!extra.length) {
    return node;
  }
  const extraDnf: StitchRunIf = [extra];
  if (node.kind === 'Fetch') {
    return { ...node, runIf: mergeRunIf(node.runIf, extraDnf) };
  }
  if (node.kind === 'BatchFetch') {
    return {
      ...node,
      runIf: mergeRunIf(node.runIf, extraDnf),
      aliases: node.aliases.map(a => ({
        ...a,
        runIf: mergeRunIf(a.runIf, extraDnf),
      })),
    };
  }
  if (node.kind === 'Island') {
    return {
      ...node,
      runIf: mergeRunIf(node.runIf, extraDnf),
      continue: node.continue ? stampRunIf(node.continue, extra) : undefined,
    };
  }
  if (node.kind === 'Condition') {
    return {
      ...node,
      ifClause: node.ifClause ? stampRunIf(node.ifClause, extra) : undefined,
      elseClause: node.elseClause ? stampRunIf(node.elseClause, extra) : undefined,
    };
  }
  if (node.kind === 'Sequence' || node.kind === 'Parallel') {
    return {
      kind: node.kind,
      nodes: node.nodes.map(c => stampRunIf(c, extra)),
    };
  }
  return node;
}

/**
 * Replace Condition trees with `runIf` on hops so both branches stay in the
 * hop set (schedule is variable-independent; off hops no-op at execute).
 */
export function flattenConditionsToRunIf(node: StitchPlanNode): StitchPlanNode {
  if (node.kind === 'Condition') {
    const parts: StitchPlanNode[] = [];
    if (node.ifClause) {
      parts.push(
        stampRunIf(flattenConditionsToRunIf(node.ifClause), [
          { variable: node.condition, equals: true },
        ]),
      );
    }
    if (node.elseClause) {
      parts.push(
        stampRunIf(flattenConditionsToRunIf(node.elseClause), [
          { variable: node.condition, equals: false },
        ]),
      );
    }
    if (!parts.length) {
      return { kind: 'Parallel', nodes: [] };
    }
    if (parts.length === 1) {
      return parts[0]!;
    }
    return { kind: 'Parallel', nodes: parts };
  }
  if (node.kind === 'Island') {
    return {
      ...node,
      continue: node.continue ? flattenConditionsToRunIf(node.continue) : undefined,
    };
  }
  if (node.kind === 'Sequence' || node.kind === 'Parallel') {
    return {
      kind: node.kind,
      nodes: node.nodes.map(flattenConditionsToRunIf),
    };
  }
  return node;
}
