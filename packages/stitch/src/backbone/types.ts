import type {
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  GraphQLResolveInfo,
  GraphQLSchema,
  OperationDefinitionNode,
  SelectionSetNode,
} from 'graphql';
import type { Subschema } from '@graphql-tools/delegate';

export type PathSegment = string | number;

/**
 * One segment of a Federation context rewrite path after `Parent` depth is
 * peeled off. Sibling type-conditioned fragments become `Alternatives` so
 * evaluation picks the branch that matches the provider typename.
 */
export type StitchContextPathSegment =
  { Key: string } | { TypenameEquals: string[] } | { Alternatives: StitchContextPathSegment[][] };

/**
 * How to fill one `@fromContext` argument on an entity Fetch from an ancestor
 * in the in-flight response (Federation join `contextArguments`).
 */
export interface StitchContextArgument {
  /** Field that owns the `@fromContext` argument (e.g. `amount`). */
  fieldName: string;
  /** Subgraph argument name. */
  argName: string;
  /** Variable name in the subgraph operation (e.g. `__context_0`). */
  variableName: string;
  /** GraphQL input type string for the variable. */
  type: string;
  /** How many object parents to walk up from the entity (from a representative path). */
  parentDepth: number;
  /**
   * Types that provide this context (`@context` providers). Execute walks
   * ancestors per entity to the nearest provider so coalesced multi-path
   * Fetches still resolve the correct depth.
   */
  providerTypeNames: string[];
  /** Selection from that ancestor (`Key` / `TypenameEquals` / `Alternatives`). */
  selectionPath: StitchContextPathSegment[];
}

/**
 * One variable predicate inside a `runIf` AND-group.
 */
export interface StitchRunIfClause {
  variable: string;
  /** Required boolean value of `variable` for this clause to hold. */
  equals: boolean;
}

/**
 * Hop `runIf` in DNF: OR of AND-groups. Missing/`undefined` means always run.
 * Example: `[[{a,true},{b,false}],[{c,true}]]` ⇒ `(a && !b) || c`.
 * DNF of AND-groups for Fetch/BatchFetch `runIf` (`||` / `&&`).
 */
export type StitchRunIf = StitchRunIfClause[][];

/**
 * One hop inside a multi-type BatchFetch. The batched document uses a single
 * merge field (from MergedTypeConfig.fieldName) with inline fragments when
 * needed; `alias` is only a stable id for plan dumps / debugging (results are
 * sliced by key ranges).
 */
export interface StitchBatchAlias {
  /** Stable id for this hop (`_e0`, ...) - not a response field alias. */
  alias: string;
  entityTypeName: string;
  /** Subgraph-local selection (foreign fields stripped at plan time). */
  selectionSet: SelectionSetNode;
  flattenPaths: PathSegment[][];
  /** Shared merge-arg variable name from argsFromKeys (e.g. `reps`). */
  representationsVariable?: string;
  /** Per-alias `@skip`/`@include` gate; off aliases send no representations. */
  runIf?: StitchRunIf;
  /** Federation `@fromContext` args for this alias's entity selection. */
  contextArguments?: StitchContextArgument[];
}

/**
 * Operation-level stitch plan node tree.
 *
 * `Sequence` / `Parallel` are planner intermediate shape only. The final plan
 * returned from `buildStitchPlan` collapses them to a flat `Parallel` bag (or
 * a single hop); execute schedules solely from `dependsOn` / `completesIds`.
 */
export type StitchPlanNode =
  | { kind: 'Sequence'; nodes: StitchPlanNode[] }
  | { kind: 'Parallel'; nodes: StitchPlanNode[] }
  | {
      kind: 'Fetch';
      /** Stable id for dataflow execute. */
      id?: string;
      /**
       * When same-type multi-path Fetches were collapsed, all original ids
       * that this hop satisfies for downstream dependsOn.
       */
      completesIds?: string[];
      /** Fetch/BatchFetch ids that must complete first. */
      dependsOn?: string[];
      /** Target subschema for this hop. */
      subschema: Subschema;
      /** Root field hops write into `data[responseKey]`. */
      rootField?: FieldNode;
      /** Entity hops: type used for merge field / merge resolver. */
      entityTypeName?: string;
      /** Selections to request from the target subschema. */
      selectionSet: SelectionSetNode;
      /**
       * Paths from operation root to the list/object(s) being flattened into.
       * Multi-path when the same entity selection applies at several sites.
       */
      flattenPaths?: PathSegment[][];
      /**
       * Prebuilt subgraph operation. When set, execute skips
       * prepareGatewayDocument / Transformer and calls the executor directly.
       */
      document?: DocumentNode;
      /**
       * When set, hop runs only if any DNF AND-group matches `variableValues`.
       * Used for root `@skip`/`@include` instead of Condition nodes.
       */
      runIf?: StitchRunIf;
      /**
       * Hop ids whose results may already cover this entity selection.
       * Execute may copy by representation hash and skip HTTP.
       */
      reuseFrom?: string[];
      /**
       * Federation `@fromContext` args for this entity hop. Execute groups
       * entities by distinct context values and injects them as variables.
       */
      contextArguments?: StitchContextArgument[];
    }
  | {
      kind: 'BatchFetch';
      id?: string;
      /**
       * All Fetch ids collapsed into this batch - dataflow marks every id
       * complete when the single HTTP call returns.
       */
      completesIds?: string[];
      dependsOn?: string[];
      subschema: Subschema;
      /** Multi-type / multi-selection hops -> one subgraph HTTP call. */
      aliases: StitchBatchAlias[];
      /** Prebuilt single merge-field document for one HTTP round-trip. */
      document?: DocumentNode;
      /** Hop-level gate (DNF); also checked before any alias work. */
      runIf?: StitchRunIf;
      reuseFrom?: string[];
      /** Per-batch hop context args (applied when aliases share grouping). */
      contextArguments?: StitchContextArgument[];
    }
  | {
      kind: 'Island';
      /** Stable id for dataflow execute. */
      id?: string;
      completesIds?: string[];
      dependsOn?: string[];
      parentTypeName: string;
      fieldNode: FieldNode;
      /**
       * Nested Island: resolve the local field on every object at these paths
       * (e.g. `Book.author` under `books`). Omit for root Islands.
       */
      flattenPaths?: PathSegment[][];
      /** Federated follow-up after the local resolver returns a merge key. */
      continue?: StitchPlanNode;
      /** When set, Island runs only if every clause matches. */
      runIf?: StitchRunIf;
    }
  | {
      /**
       * Runtime `@skip`/`@include` branch. `condition` is the variable name;
       * true -> ifClause, otherwise elseClause.
       * Prefer `runIf` on hops (flattened at plan time); Condition remains for
       * legacy / un-flattenable trees.
       */
      kind: 'Condition';
      condition: string;
      ifClause?: StitchPlanNode;
      elseClause?: StitchPlanNode;
    };

/**
 * Cached in-degree schedule for continuous dispatch. Hop indices match
 * {@link collectExecutableHops} order. Prefer `runIf` (var-independent hop set)
 * so the schedule can always be cached; omitted only when Condition remains.
 */
export interface StitchPlanSchedule {
  /** How many predecessor hops each hop waits for. */
  waits: number[];
  /** Hop indices that wait on each hop. */
  dependents: number[][];
}

export interface StitchPlan {
  operation: OperationDefinitionNode;
  fragments: Record<string, FragmentDefinitionNode>;
  root: StitchPlanNode;
  /**
   * Precomputed schedule for `root` when it has no Condition. Execute rebuilds
   * from the selected branch when Condition is present. With `runIf`-only plans
   * the hop set is fixed and schedule is always present.
   */
  schedule?: StitchPlanSchedule;
  /** When true, executor must fall back to schema execute. */
  incomplete: boolean;
  /** Reasons the plan is incomplete (hooks, unsupported nodes, etc.). */
  incompleteReasons: string[];
}

/**
 * Static options for `createBackboneExecutor` / plan-cache keying.
 * Per-request GraphQL context is NOT an option - it comes from
 * `ExecutionRequest.context` and is passed into `buildStitchPlan` per call.
 */
export interface BackboneExecutorOptions {
  /**
   * Progressive override label handler (gateway `progressiveOverride`).
   * Used for plan-cache keying when `overrideLabels` is also set.
   * Persisted flat on `stitchingInfo.handleProgressiveOverride` so a
   * post-`mapSchema` re-attach needs no options bag.
   */
  handleProgressiveOverride?: (label: string, context: any) => boolean | Promise<boolean>;
  /**
   * Known progressive-override labels from the supergraph. Combined with
   * `handleProgressiveOverride` + request context to cache plans per enabled set.
   * Prefer `stitchSchemas({ overrideLabels })` / attach options; persisted flat
   * on `stitchingInfo.overrideLabels` for optionless re-attach after `mapSchema`.
   */
  overrideLabels?: Iterable<string>;
}

/** Per-call inputs for `buildStitchPlan` (static opts + request context). */
export interface BuildStitchPlanOptions extends BackboneExecutorOptions {
  /**
   * Request GraphQL context - progressive override / delegationPlanBuilder
   * during planning. From `ExecutionRequest.context`, never a constructor opt.
   */
  context?: any;
}

export interface BackboneExecutionContext {
  schema: GraphQLSchema;
  document: DocumentNode;
  operation: OperationDefinitionNode;
  fragments: Record<string, FragmentDefinitionNode>;
  variableValues: Record<string, any>;
  contextValue: any;
  rootValue: any;
  signal?: AbortSignal;
  data: Record<string, any>;
  errors: Error[];
  infoStub: Partial<GraphQLResolveInfo>;
  /**
   * Representation-hash → entity object for reuse across hops (always on for
   * queries; skipped for mutations / after errors).
   */
  entityByRepHash?: Map<string, Record<string, any>>;
  /**
   * Set when a non-null mutation root field fails. Remaining hops (including
   * later mutation roots) are released without running — graphql-js /
   * classic stitching parity (no further side effects once data is null).
   */
  abortRemainingHops?: boolean;
}
