import AsyncDisposableStack from 'disposablestack/AsyncDisposableStack';
import type { DocumentNode, GraphQLSchema } from 'graphql';
import { buildASTSchema, buildSchema, isSchema } from 'graphql';
import { getInContextSDK } from '@graphql-mesh/runtime';
import type { TransportOptions } from '@graphql-mesh/serve-runtime';
import type { TransportContext, TransportEntry } from '@graphql-mesh/transport-common';
import type { OnDelegateHook } from '@graphql-mesh/types';
import { mapMaybePromise } from '@graphql-mesh/utils';
import type { SubschemaConfig } from '@graphql-tools/delegate';
import type { IResolvers, MaybePromise, TypeSource } from '@graphql-tools/utils';
import { isDocumentNode } from '@graphql-tools/utils';
import { compareSubgraphNames, handleFederationSupergraph } from './federation.js';
import {
  compareSchemas,
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
  transports?: Transports;
  transportOptions?: TransportOptions;
  polling?: number;
  additionalTypeDefs?: TypeSource;
  additionalResolvers?: IResolvers<unknown, TContext> | IResolvers<unknown, TContext>[];
  transportContext?: TransportContext;
  onSubgraphExecuteHooks?: OnSubgraphExecuteHook[];
  // TODO: Will be removed later once we get rid of v0
  onDelegateHooks?: OnDelegateHook<unknown>[];
}

export class UnifiedGraphManager<TContext> {
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
    if (this.opts.polling) {
      this.currentTimeout = setTimeout(() => {
        this.currentTimeout = undefined;
        return this.getAndSetUnifiedGraph();
      }, this.opts.polling);
    }
  }

  private ensureUnifiedGraph() {
    if (!this.initialUnifiedGraph$) {
      this.initialUnifiedGraph$ = this.getAndSetUnifiedGraph();
    }
    return this.initialUnifiedGraph$;
  }

  private getAndSetUnifiedGraph() {
    this.pausePolling();
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
        let cleanupJob$: Promise<true>;
        if (this._transportExecutorStack) {
          cleanupJob$ = this._transportExecutorStack.disposeAsync().then(() => true);
        }
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
        });
        this.unifiedGraph = newUnifiedGraph;
        const onSubgraphExecute = getOnSubgraphExecute({
          onSubgraphExecuteHooks: this.onSubgraphExecuteHooks,
          transports: this.opts.transports,
          transportOptions: this.opts.transportOptions,
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
        return cleanupJob$ || true;
      },
    );
  }

  public getTransportEntryMap() {
    return mapMaybePromise(this.ensureUnifiedGraph(), () => this._transportEntryMap);
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

  invalidateUnifiedGraph() {
    return this.getAndSetUnifiedGraph();
  }

  [Symbol.asyncDispose]() {
    return this.disposableStack.disposeAsync();
  }
}
