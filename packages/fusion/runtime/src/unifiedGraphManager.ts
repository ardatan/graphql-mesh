import type { DocumentNode, GraphQLSchema } from 'graphql';
import { buildASTSchema, buildSchema, isSchema } from 'graphql';
import { getInContextSDK } from '@graphql-mesh/runtime';
import type { TransportEntryAdditions } from '@graphql-mesh/serve-runtime';
import type { TransportContext, TransportEntry } from '@graphql-mesh/transport-common';
import type { OnDelegateHook } from '@graphql-mesh/types';
import { mapMaybePromise } from '@graphql-mesh/utils';
import type { SubschemaConfig } from '@graphql-tools/delegate';
import type { IResolvers, MaybePromise, TypeSource } from '@graphql-tools/utils';
import { isDocumentNode } from '@graphql-tools/utils';
import { AsyncDisposableStack, DisposableSymbols } from '@whatwg-node/disposablestack';
import { handleFederationSupergraph } from './federation/supergraph.js';
import {
  compareSchemas,
  compareSubgraphNames,
  getOnSubgraphExecute,
  type OnSubgraphExecuteHook,
  type Transports,
} from './utils.js';

function ensureSchema(source: GraphQLSchema | DocumentNode | string) {
  if (isSchema(source)) {
    return source;
  }
  if (typeof source === 'string') {
    return buildSchema(source, { assumeValid: true, assumeValidSDL: true });
  }
  if (isDocumentNode(source)) {
    return buildASTSchema(source, { assumeValid: true, assumeValidSDL: true });
  }
  return source;
}

export interface GetExecutableSchemaFromSupergraphOptions<TContext extends Record<string, any>> {
  additionalTypeDefs?: DocumentNode | string | DocumentNode[] | string[];
  additionalResolvers?: IResolvers<unknown, TContext> | IResolvers<unknown, TContext>[];
  transportContext?: TransportContext;
}

export type UnifiedGraphHandler = (opts: UnifiedGraphHandlerOpts) => UnifiedGraphHandlerResult;

export interface UnifiedGraphHandlerOpts {
  unifiedGraph: GraphQLSchema;
  additionalTypeDefs?: TypeSource;
  additionalResolvers?: IResolvers<unknown, any> | IResolvers<unknown, any>[];
  onSubgraphExecute: ReturnType<typeof getOnSubgraphExecute>;
  transportEntryAdditions?: TransportEntryAdditions;
  /**
   * Whether to batch the subgraph executions.
   * @default true
   */
  batch?: boolean;
}

export interface UnifiedGraphHandlerResult {
  unifiedGraph: GraphQLSchema;
  transportEntryMap: Record<string, TransportEntry>;
  subschemas: SubschemaConfig[];
  additionalResolvers: IResolvers[];
}

export interface UnifiedGraphManagerOptions<TContext> {
  getUnifiedGraph(ctx: TransportContext): MaybePromise<GraphQLSchema | string | DocumentNode>;
  // Handle the unified graph by any specification
  handleUnifiedGraph?: UnifiedGraphHandler;
  onSchemaChange?(unifiedGraph: GraphQLSchema): void;
  transports?: Transports;
  transportEntryAdditions?: TransportEntryAdditions;
  /** Schema polling interval in milliseconds. */
  pollingInterval?: number;
  additionalTypeDefs?: TypeSource;
  additionalResolvers?: IResolvers<unknown, TContext> | IResolvers<unknown, TContext>[];
  transportContext?: TransportContext;
  onSubgraphExecuteHooks?: OnSubgraphExecuteHook[];
  // TODO: Will be removed later once we get rid of v0
  onDelegateHooks?: OnDelegateHook<unknown>[];
  /**
   * Whether to batch the subgraph executions.
   * @default true
   */
  batch?: boolean;
}

export class UnifiedGraphManager<TContext> {
  private batch: boolean;
  private handleUnifiedGraph: UnifiedGraphHandler;
  private unifiedGraph: GraphQLSchema;
  private lastLoadedUnifiedGraph: string | GraphQLSchema | DocumentNode;
  private onSubgraphExecuteHooks: OnSubgraphExecuteHook[];
  private currentTimeout: NodeJS.Timeout | undefined;
  private inContextSDK;
  private initialUnifiedGraph$: MaybePromise<true>;
  private disposableStack = new AsyncDisposableStack();
  private _transportEntryMap: Record<string, TransportEntry>;
  private _transportExecutorStack: AsyncDisposableStack;
  constructor(private opts: UnifiedGraphManagerOptions<TContext>) {
    this.batch = opts.batch ?? true;
    this.handleUnifiedGraph = opts.handleUnifiedGraph || handleFederationSupergraph;
    this.onSubgraphExecuteHooks = opts?.onSubgraphExecuteHooks || [];
    this.disposableStack.defer(() => {
      this.unifiedGraph = undefined;
      this.lastLoadedUnifiedGraph = undefined;
      this.inContextSDK = undefined;
      this.initialUnifiedGraph$ = undefined;
      this.pausePolling();
      return this._transportExecutorStack?.disposeAsync();
    });
  }

  private pausePolling() {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = undefined;
    }
  }

  private continuePolling() {
    if (this.opts.pollingInterval) {
      this.currentTimeout = setTimeout(() => {
        this.currentTimeout = undefined;
        return this.getAndSetUnifiedGraph();
      }, this.opts.pollingInterval);
    }
  }

  private ensureUnifiedGraph() {
    if (!this.initialUnifiedGraph$ && !this.unifiedGraph) {
      this.initialUnifiedGraph$ = this.getAndSetUnifiedGraph();
    }
    return this.initialUnifiedGraph$;
  }

  private getAndSetUnifiedGraph(): MaybePromise<true> {
    this.pausePolling();
    try {
      return mapMaybePromise(
        this.opts.getUnifiedGraph(this.opts.transportContext),
        (loadedUnifiedGraph: string | GraphQLSchema | DocumentNode) => {
          if (
            loadedUnifiedGraph != null &&
            this.lastLoadedUnifiedGraph != null &&
            compareSchemas(loadedUnifiedGraph, this.lastLoadedUnifiedGraph)
          ) {
            this.opts.transportContext?.logger?.debug('Unified Graph has not changed, skipping...');
            this.continuePolling();
            return;
          }
          if (this.lastLoadedUnifiedGraph != null) {
            this.opts.transportContext?.logger?.debug('Unified Graph changed, updating...');
          }
          let cleanupJob$: MaybePromise<void>;
          if (this._transportExecutorStack) {
            cleanupJob$ = this._transportExecutorStack.disposeAsync();
          }
          return mapMaybePromise(cleanupJob$, () => {
            this._transportExecutorStack = new AsyncDisposableStack();
            this.lastLoadedUnifiedGraph ||= loadedUnifiedGraph;
            this.lastLoadedUnifiedGraph = loadedUnifiedGraph;
            this.unifiedGraph = ensureSchema(loadedUnifiedGraph);
            const {
              unifiedGraph: newUnifiedGraph,
              transportEntryMap,
              subschemas,
              additionalResolvers,
            } = this.handleUnifiedGraph({
              unifiedGraph: this.unifiedGraph,
              additionalTypeDefs: this.opts.additionalTypeDefs,
              additionalResolvers: this.opts.additionalResolvers,
              onSubgraphExecute(subgraphName, execReq) {
                return onSubgraphExecute(subgraphName, execReq);
              },
              transportEntryAdditions: this.opts.transportEntryAdditions,
              batch: this.batch,
            });
            this.unifiedGraph = newUnifiedGraph;
            const onSubgraphExecute = getOnSubgraphExecute({
              onSubgraphExecuteHooks: this.onSubgraphExecuteHooks,
              transports: this.opts.transports,
              transportContext: this.opts.transportContext,
              transportEntryMap,
              getSubgraphSchema(subgraphName) {
                const subgraph = subschemas.find(s => compareSubgraphNames(s.name, subgraphName));
                if (!subgraph) {
                  throw new Error(`Subgraph ${subgraphName} not found`);
                }
                return subgraph.schema;
              },
              transportExecutorStack: this._transportExecutorStack,
            });
            if (this.opts.additionalResolvers || additionalResolvers.length) {
              this.inContextSDK = getInContextSDK(
                this.unifiedGraph,
                // @ts-expect-error Legacy Mesh RawSource is not compatible with new Mesh
                subschemas,
                this.opts.transportContext?.logger,
                this.opts.onDelegateHooks || [],
              );
            }
            this.continuePolling();
            this._transportEntryMap = transportEntryMap;
            this.opts.onSchemaChange?.(this.unifiedGraph);
            return true;
          });
        },
        err => {
          this.opts.transportContext?.logger?.error('Failed to load Supergraph', err);
          this.continuePolling();
          if (!this.unifiedGraph) {
            throw err;
          }
          return true;
        },
      );
    } catch (e) {
      this.opts.transportContext?.logger?.error('Failed to load Supergraph', e);
      this.continuePolling();
      if (!this.unifiedGraph) {
        throw e;
      }
      return true;
    }
  }

  public getUnifiedGraph() {
    return mapMaybePromise(this.ensureUnifiedGraph(), () => this.unifiedGraph);
  }

  public getContext<T extends {} = {}>(base: T = {} as T) {
    return mapMaybePromise(this.ensureUnifiedGraph(), () => {
      if (this.inContextSDK) {
        Object.assign(base, this.inContextSDK);
      }
      Object.assign(base, this.opts.transportContext);
      return base;
    });
  }

  public getTransportEntryMap() {
    return mapMaybePromise(this.ensureUnifiedGraph(), () => this._transportEntryMap);
  }

  invalidateUnifiedGraph() {
    return this.getAndSetUnifiedGraph();
  }

  [DisposableSymbols.asyncDispose]() {
    return this.disposableStack.disposeAsync();
  }
}
