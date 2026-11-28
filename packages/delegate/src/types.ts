import type DataLoader from 'dataloader';
import {
  type FieldNode,
  type FragmentDefinitionNode,
  type GraphQLError,
  type GraphQLFieldResolver,
  type GraphQLNamedType,
  type GraphQLOutputType,
  type GraphQLResolveInfo,
  type GraphQLSchema,
  type OperationTypeNode,
  type SelectionSetNode,
} from 'graphql';
import type { ExecutionRequest, ExecutionResult, Executor } from '@graphql-tools/utils';
import { type Subschema } from './Subschema.js';
import {
  type FIELD_SUBSCHEMA_MAP_SYMBOL,
  type OBJECT_SUBSCHEMA_SYMBOL,
  type UNPATHED_ERRORS_SYMBOL,
} from './symbols.js';

export type SchemaTransform<TContext = Record<any, string>> = (
  originalWrappingSchema: GraphQLSchema,
  subschemaConfig: SubschemaConfig<any, any, any, TContext>,
) => GraphQLSchema;
export type RequestTransform<T = Record<string, any>, TContext = Record<any, string>> = (
  originalRequest: ExecutionRequest,
  delegationContext: DelegationContext<TContext>,
  transformationContext: T,
) => ExecutionRequest;
export type ResultTransform<T = Record<string, any>, TContext = Record<any, string>> = (
  originalResult: ExecutionResult,
  delegationContext: DelegationContext<TContext>,
  transformationContext: T,
) => ExecutionResult;

export interface Transform<T = any, TContext = Record<string, any>> {
  transformSchema?: SchemaTransform<TContext>;
  transformRequest?: RequestTransform<T, TContext>;
  transformResult?: ResultTransform<T, TContext>;
}

export interface DelegationContext<TContext = Record<string, any>> {
  subschema: GraphQLSchema | SubschemaConfig<any, any, any, TContext>;
  subschemaConfig?: SubschemaConfig<any, any, any, TContext>;
  targetSchema: GraphQLSchema;
  operation: OperationTypeNode;
  fieldName: string;
  args?: Record<string, any>;
  context?: TContext;
  info?: GraphQLResolveInfo;
  returnType: GraphQLOutputType;
  onLocatedError?: (originalError: GraphQLError) => GraphQLError;
  rootValue?: any;
  transforms: Array<Transform<any, TContext>>;
  transformedSchema: GraphQLSchema;
  skipTypeMerging: boolean;
}

export interface IDelegateToSchemaOptions<
  TContext = Record<string, any>,
  TArgs = Record<string, any>,
> {
  schema: GraphQLSchema | SubschemaConfig<any, any, any, TContext>;
  operationName?: string;
  operation?: OperationTypeNode;
  fieldName?: string;
  returnType?: GraphQLOutputType;
  onLocatedError?: (originalError: GraphQLError) => GraphQLError;
  args?: TArgs;
  selectionSet?: SelectionSetNode;
  fieldNodes?: ReadonlyArray<FieldNode>;
  context?: TContext;
  info: GraphQLResolveInfo;
  rootValue?: any;
  transforms?: Array<Transform<any, TContext>>;
  targetSchema?: GraphQLSchema;
  validateRequest?: boolean;
  skipTypeMerging?: boolean;
}

export interface IDelegateRequestOptions<
  TContext = Record<string, any>,
  TArgs = Record<string, any>,
> extends IDelegateToSchemaOptions<TContext, TArgs> {
  request: ExecutionRequest;
  targetSchema: GraphQLSchema;
}

export interface ICreateRequest {
  subgraphName: string | undefined;
  fragments?: FragmentDefinitionNode[];
  targetOperation: OperationTypeNode;
  targetOperationName?: string;
  targetFieldName: string;
  targetSchema: GraphQLSchema;
  selectionSet?: SelectionSetNode;
  fieldNodes?: ReadonlyArray<FieldNode>;
  rootValue?: any;
  args?: Record<string, any>;
  context?: any;
  info?: GraphQLResolveInfo;
}

export type DelegationPlanBuilder = (
  schema: GraphQLSchema,
  sourceSubschema: Subschema<any, any, any, any>,
  variableValues: Record<string, any>,
  fragments: Record<string, FragmentDefinitionNode>,
  fieldNodes: FieldNode[],
  context?: any,
  info?: GraphQLResolveInfo,
  /**
   * ExternalObject being merged. @requires planning seeds
   * already-present fields from this parent so resolve-time leftover can
   * see deps filled by earlier hops.
   */
  parent?: any,
) => Array<Map<Subschema, SelectionSetNode>>;

export interface MergedTypeInfo<TContext = Record<string, any>> {
  typeName: string;
  selectionSet?: SelectionSetNode;
  targetSubschemas: Map<
    Subschema<any, any, any, TContext>,
    Array<Subschema<any, any, any, TContext>>
  >;
  uniqueFields: Record<string, Subschema<any, any, any, TContext>>;
  nonUniqueFields: Record<string, Array<Subschema<any, any, any, TContext>>>;
  typeMaps: Map<
    GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
    Record<string, GraphQLNamedType>
  >;
  selectionSets: Map<Subschema<any, any, any, TContext>, SelectionSetNode>;
  /**
   * When a subschema keeps multiple `entryPoints`, each
   * entry's key selectionSet. The delegation plan builder treats the
   * subschema as proxiable when *any* entry's keys are already available
   * on the sources.
   */
  entryPointSelectionSets?: Map<Subschema<any, any, any, TContext>, SelectionSetNode[]>;
  fieldSelectionSets: Map<Subschema<any, any, any, TContext>, Record<string, SelectionSetNode>>;
  resolvers: Map<Subschema<any, any, any, TContext>, MergedTypeResolver<TContext>>;
  providedSelectionsByField: Map<
    Subschema<any, any, any, TContext>,
    Record<string, SelectionSetNode>
  >;
  delegationPlanBuilder: DelegationPlanBuilder;
  nonMemoizedDelegationPlanBuilder: DelegationPlanBuilder;
}

export interface ICreateProxyingResolverOptions<TContext = Record<string, any>> {
  subschemaConfig: SubschemaConfig<any, any, any, TContext>;
  operation?: OperationTypeNode;
  fieldName?: string;
}

export type CreateProxyingResolverFn<TContext = Record<string, any>> = (
  options: ICreateProxyingResolverOptions<TContext>,
) => GraphQLFieldResolver<any, TContext>;

export interface BatchingOptions<K = any, V = any, C = K> {
  extensionsReducer?: (
    mergedExtensions: Record<string, any>,
    request: ExecutionRequest,
  ) => Record<string, any>;
  dataLoaderOptions?: DataLoader.Options<K, V, C>;
  /**
   * When true, each batched sub-request's root selections are wrapped in
   * `@defer` so a defer-capable executor can deliver fast results without
   * waiting for the slowest sibling in the batch. Requires an executor that
   * returns incremental results (e.g. `@graphql-tools/executor`).
   */
  defer?: boolean;
}

export interface SubschemaConfig<K = any, V = any, C = K, TContext = Record<string, any>> {
  name?: string;
  schema: GraphQLSchema;
  createProxyingResolver?: CreateProxyingResolverFn<TContext>;
  rootValue?: any;
  transforms?: Array<Transform<any, TContext>>;
  merge?: Record<string, MergedTypeConfig<any, any, TContext>>;
  executor?: Executor<TContext>;
  batch?: boolean;
  batchingOptions?: BatchingOptions<K, V, C>;
  /**
   * When true, `@defer` is forwarded to this subschema and incremental patches
   * from its executor are merged into the gateway result. When false/omitted,
   * `@defer` is owned by the gateway (deferred selections are omitted from the
   * subgraph request and resolved later via type-merging / local resolvers).
   */
  defer?: boolean;
}

export interface MergedTypeConfig<
  K = any,
  V = any,
  TContext = Record<string, any>,
> extends MergedTypeEntryPoint<K, V, TContext> {
  entryPoints?: Array<MergedTypeEntryPoint>;
  fields?: Record<string, MergedFieldConfig>;
  canonical?: boolean;
}

export interface MergedTypeEntryPoint<
  K = any,
  V = any,
  TContext = Record<string, any>,
> extends MergedTypeResolverOptions<K, V> {
  selectionSet?: string;
  key?: (originalResult: any) => K | PromiseLike<K>;
  resolve?: MergedTypeResolver<TContext>;
}

export interface MergedTypeResolverOptions<K = any, V = any> {
  fieldName?: string;
  args?: (originalResult: any) => Record<string, any>;
  argsFromKeys?: (keys: ReadonlyArray<K>) => Record<string, any>;
  valuesFromResults?: (results: any, keys: ReadonlyArray<K>) => Array<V>;
  dataLoaderOptions?: DataLoader.Options<K, V>;
}

export type OverrideHandler = (context: any, info: GraphQLResolveInfo) => boolean;

/**
 * Federation join v0.5 `@join__field(contextArguments:)` entry. The public
 * API schema omits the argument; the subgraph still receives it, filled from
 * the nearest `@context` ancestor at execute time.
 */
export interface MergedFieldContextArgument {
  /** Subgraph argument name (e.g. `code`). */
  name: string;
  /** GraphQL input type string (e.g. `String`). */
  type: string;
  /** Context name as composed (`subgraph__localName`). */
  context: string;
  /** Context selection relative to the provider (e.g. ` { currency }`). */
  selection: string;
}

export interface MergedFieldConfig {
  selectionSet?: string;
  computed?: boolean;
  canonical?: boolean;
  provides?: SelectionSetNode;
  override?: OverrideHandler;
  /**
   * Federation `@fromContext` args preserved from join `contextArguments`.
   * When set, the stitch backbone plans a separate entity hop and injects
   * values from the nearest matching `@context` ancestor.
   */
  contextArguments?: MergedFieldContextArgument[];
}

export type MergedTypeResolver<TContext = Record<string, any>> = (
  originalResult: any,
  context: TContext,
  info: GraphQLResolveInfo,
  subschema: Subschema<any, any, any, TContext>,
  selectionSet: SelectionSetNode,
  key: any | undefined,
  type: GraphQLOutputType,
  skipTypeMerging?: boolean,
) => any;

export interface StitchingInfo<TContext = Record<string, any>> {
  subschemaMap: Map<
    GraphQLSchema | SubschemaConfig<any, any, any, TContext>,
    Subschema<any, any, any, TContext>
  >;
  fieldNodesByType: Record<string, Array<FieldNode>>;
  fieldNodesByField: Record<string, Record<string, Array<FieldNode>>>;
  dynamicSelectionSetsByField: Record<
    string,
    Record<string, Array<(node: FieldNode) => SelectionSetNode>>
  >;
  mergedTypes: Record<string, MergedTypeInfo<TContext>>;
  /**
   * Gateway-local fields (additionalResolvers / @resolveTo / late root
   * overrides) that have no subschema owner. Backbone planner emits Island
   * nodes for these.
   */
  localFields: Map<string, Set<string>>;
  /**
   * Federation `@context(name:)` providers on the supergraph: composed context
   * name (`subgraph__localName`) → type names that set that context.
   */
  contextProviders?: Record<string, string[]>;
}

export interface ExternalObject<TContext = Record<string, any>> {
  /** Present when the source annotated or returned a typename; not guaranteed. */
  __typename?: string;
  /** Optional merge key; annotation does not always install one. */
  key?: any;
  [OBJECT_SUBSCHEMA_SYMBOL]: GraphQLSchema | SubschemaConfig<any, any, any, TContext> | undefined;
  [FIELD_SUBSCHEMA_MAP_SYMBOL]: Record<
    string,
    GraphQLSchema | SubschemaConfig<any, any, any, TContext>
  >;
  [UNPATHED_ERRORS_SYMBOL]: Array<GraphQLError>;
  [key: string]: unknown;
}
