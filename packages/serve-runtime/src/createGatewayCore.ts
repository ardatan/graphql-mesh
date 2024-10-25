import { createYoga, type YogaServerInstance, type YogaServerOptions } from 'graphql-yoga';
import type { OnSubgraphExecuteHook } from '@graphql-mesh/fusion-runtime';
import type {
  GatewayConfigContext,
  GatewayContext,
  GatewayPlugin,
} from '@graphql-mesh/serve-runtime';
import type { OnDelegateHook, OnFetchHook } from '@graphql-mesh/types';
import {
  getHeadersObj,
  isDisposable,
  makeAsyncDisposable,
  wrapFetchWithHooks,
} from '@graphql-mesh/utils';
import { AsyncDisposableStack } from '@whatwg-node/disposablestack';

export type GatewayRuntime<TContext extends Record<string, any> = Record<string, any>> =
  YogaServerInstance<{}, TContext> & AsyncDisposable;

export type GatewayConfigContext2 = GatewayConfigContext & {
  onFetchHooks: OnFetchHook<GatewayContext>[];
  onSubgraphExecuteHooks: OnSubgraphExecuteHook[];
  onDelegateHooks: OnDelegateHook<unknown>[];
  disposableStack: AsyncDisposableStack;
};

type YogeCleaned<TContext> = Omit<YogaServerOptions<{}, TContext>, 'plugins' | 'context'>;

export type GatewayConfig2<TContext> = YogeCleaned<TContext> & {
  plugins?: (config: GatewayConfigContext2) => GatewayPlugin[];
  context?: (config: GatewayContext & TContext) => TContext;
};

export function createGatewayCore<TContext extends Record<string, any> = Record<string, any>>(
  config: GatewayConfig2<TContext>,
): GatewayRuntime<TContext> {
  let fetchAPI = config.fetchAPI;

  const onFetchHooks: OnFetchHook<GatewayContext>[] = [];
  const onSubgraphExecuteHooks: OnSubgraphExecuteHook[] = [];
  const onDelegateHooks: OnDelegateHook<unknown>[] = [];
  const disposableStack = new AsyncDisposableStack();

  const configContext: GatewayConfigContext2 = {
    fetch: wrapFetchWithHooks(onFetchHooks),
    logger: config.logging as any,
    cwd: '.',
    cache: undefined,
    pubsub: undefined,

    onFetchHooks,
    onSubgraphExecuteHooks,
    onDelegateHooks,
    disposableStack,
  };

  const defaultGatewayPlugin: GatewayPlugin<TContext> = {
    onFetch({ setFetchFn }) {
      if (fetchAPI?.fetch) {
        setFetchFn(fetchAPI.fetch);
      }
    },
    onPluginInit({ plugins }) {
      onFetchHooks.splice(0, onFetchHooks.length);
      onSubgraphExecuteHooks.splice(0, onSubgraphExecuteHooks.length);
      onDelegateHooks.splice(0, onDelegateHooks.length);
      for (const plugin of plugins as GatewayPlugin[]) {
        if (plugin.onFetch) {
          onFetchHooks.push(plugin.onFetch);
        }
        if (plugin.onSubgraphExecute) {
          onSubgraphExecuteHooks.push(plugin.onSubgraphExecute);
        }
        // @ts-expect-error For backward compatibility
        if (plugin.onDelegate) {
          // @ts-expect-error For backward compatibility
          onDelegateHooks.push(plugin.onDelegate);
        }
        if (isDisposable(plugin)) {
          disposableStack.use(plugin);
        }
      }
    },
  };

  const yoga = createYoga<{}, TContext>({
    ...config,
    fetchAPI: config.fetchAPI,
    plugins: [defaultGatewayPlugin, ...(config.plugins?.(configContext) || [])],
    context({ request, params, ...rest }) {
      // TODO: I dont like this cast, but it's necessary
      const { req, connectionParams } = rest as {
        req?: { headers?: Record<string, string> };
        connectionParams?: Record<string, string>;
      };
      let headers = // Maybe Node-like environment
        req?.headers
          ? getHeadersObj(req.headers)
          : // Fetch environment
            request?.headers
            ? getHeadersObj(request.headers)
            : // Unknown environment
              {};
      if (connectionParams) {
        headers = { ...headers, ...connectionParams };
      }
      const baseContext: any = {
        ...configContext,
        request,
        params,
        headers,
        connectionParams: headers,
      };
      if (config.context) {
        return config.context(baseContext);
      }
      return baseContext;
    },
  });

  fetchAPI ||= yoga.fetchAPI;

  return makeAsyncDisposable(yoga, () =>
    disposableStack.disposeAsync(),
  ) as any as GatewayRuntime<TContext>;
}
