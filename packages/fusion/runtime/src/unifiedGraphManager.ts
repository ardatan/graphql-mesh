import AsyncDisposableStack from 'disposablestack/AsyncDisposableStack';
import { buildASTSchema, buildSchema, DocumentNode, GraphQLSchema, isSchema } from 'graphql';
import { getInContextSDK } from '@graphql-mesh/runtime';
import { TransportBaseContext, TransportEntry } from '@graphql-mesh/transport-common';
import { OnDelegateHook } from '@graphql-mesh/types';
import { mapMaybePromise } from '@graphql-mesh/utils';
import { SubschemaConfig } from '@graphql-tools/delegate';
import { stitchSchemas } from '@graphql-tools/stitch';
import {
  IResolvers,
  isDocumentNode,
  MaybePromise,
  pruneSchema,
  TypeSource,
} from '@graphql-tools/utils';
import { filterHiddenPartsInSchema } from './filterHiddenPartsInSchema.js';
import { extractSubgraphsFromFusiongraph } from './getSubschemasFromFusiongraph.js';
import {
  compareSchemas,
  getOnSubgraphExecute,
  OnSubgraphExecuteHook,
  TransportsOption,
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

export interface GetExecutableSchemaFromFusiongraphOptions<TContext extends Record<string, any>> {
  additionalTypeDefs?: DocumentNode | string | DocumentNode[] | string[];
  additionalResolvers?: IResolvers<unknown, TContext> | IResolvers<unknown, TContext>[];
  transportBaseContext?: TransportBaseContext;
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
  getUnifiedGraph(
    baseCtx: TransportBaseContext,
  ): MaybePromise<GraphQLSchema | string | DocumentNode>;
  // Handle the unified graph by any specification
  handleUnifiedGraph?: UnifiedGraphHandler;
  transports?: TransportsOption;
  polling?: number;
  additionalTypeDefs?: TypeSource;
  additionalResolvers?: IResolvers<unknown, TContext> | IResolvers<unknown, TContext>[];
  transportBaseContext?: TransportBaseContext;
  onSubgraphExecuteHooks?: OnSubgraphExecuteHook[];
  // TODO: Will be removed later once we get rid of v0
  onDelegateHooks?: OnDelegateHook<unknown>[];
}

export const handleFusiongraph: UnifiedGraphHandler = function handleFusiongraph(opts) {
  const { subschemas, transportEntryMap, additionalTypeDefs, additionalResolvers } =
    extractSubgraphsFromFusiongraph(opts.unifiedGraph, function (subschemaConfig) {
      subschemaConfig.executor = function executor(execReq) {
        return opts.onSubgraphExecute(subschemaConfig.name, execReq);
      };
    });
  const unifiedGraph = pruneSchema(
    filterHiddenPartsInSchema(
      stitchSchemas({
        subschemas,
        assumeValid: true,
        assumeValidSDL: true,
        typeDefs: [opts.additionalTypeDefs, ...additionalTypeDefs],
        resolvers: [opts.additionalResolvers as any, ...additionalResolvers],
      }),
    ),
  );

  return {
    unifiedGraph,
    transportEntryMap,
    subschemas,
    additionalTypeDefs,
    additionalResolvers,
  };
};

export class UnifiedGraphManager<TContext> {
  private handleUnifiedGraph: UnifiedGraphHandler;
  private unifiedGraph: GraphQLSchema;
  private lastLoadedUnifiedGraph: string | GraphQLSchema | DocumentNode;
  private onSubgraphExecuteHooks: OnSubgraphExecuteHook[];
  private currentTimeout: NodeJS.Timeout | undefined;
  private inContextSDK;
  private initialUnifiedGraph$: MaybePromise<void>;
  private disposableStack = new AsyncDisposableStack();
  constructor(private opts: UnifiedGraphManagerOptions<TContext>) {
    this.handleUnifiedGraph = opts.handleUnifiedGraph || handleFusiongraph;
    this.onSubgraphExecuteHooks = opts?.onSubgraphExecuteHooks || [];
    this.disposableStack.defer(() => {
      this.unifiedGraph = undefined;
      this.lastLoadedUnifiedGraph = undefined;
      this.inContextSDK = undefined;
      this.initialUnifiedGraph$ = undefined;
      this.pausePolling();
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
      this.opts.getUnifiedGraph(this.opts.transportBaseContext),
      (loadedUnifiedGraph: string | GraphQLSchema | DocumentNode) => {
        if (
          loadedUnifiedGraph != null &&
          this.lastLoadedUnifiedGraph != null &&
          compareSchemas(loadedUnifiedGraph, this.lastLoadedUnifiedGraph)
        ) {
          this.opts.transportBaseContext?.logger?.debug(
            'Unified Graph has not changed, skipping...',
          );
          this.continuePolling();
          return;
        }
        if (this.lastLoadedUnifiedGraph != null) {
          this.opts.transportBaseContext?.logger?.debug('Unified Graph changed, updating...');
        }
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
          transportBaseContext: this.opts.transportBaseContext,
          transportEntryMap,
          getSubgraphSchema(subgraphName) {
            const subgraph = subschemas.find(s => s.name === subgraphName);
            if (!subgraph) {
              throw new Error(`Subgraph ${subgraphName} not found`);
            }
            return subgraph.schema;
          },
          disposableStack: this.disposableStack,
        });
        if (this.opts.additionalResolvers || additionalResolvers.length) {
          this.inContextSDK = getInContextSDK(
            this.unifiedGraph,
            // @ts-expect-error Legacy Mesh RawSource is not compatible with new Mesh
            subschemas,
            this.opts.transportBaseContext?.logger,
            this.opts.onDelegateHooks || [],
          );
        }
        this.continuePolling();
      },
    );
  }

  public getUnifiedGraph() {
    return mapMaybePromise(this.ensureUnifiedGraph(), () => this.unifiedGraph);
  }

  public getContext<T extends {} = {}>(base: T = {} as T) {
    return mapMaybePromise(this.ensureUnifiedGraph(), () => {
      if (this.inContextSDK) {
        Object.assign(base, this.inContextSDK);
      }
      Object.assign(base, this.opts.transportBaseContext);
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
