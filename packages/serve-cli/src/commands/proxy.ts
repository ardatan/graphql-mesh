import {
  createServeRuntime,
  type MeshServeConfigWithProxy,
  type MeshServeRuntime,
} from '@graphql-mesh/serve-runtime';
import { loadConfig } from '../config.js';
import { defaultProgram, program, type Program, type ProgramOptions } from '../program.js';
import { startServerForRuntime } from '../server.js';

program
  .command('proxy')
  .description(
    'serve a proxy to a GraphQL API and add additional features such as monitoring/tracing, caching, rate limiting, security, and more',
  )
  .argument('endpoint', 'URL of the endpoint GraphQL API to proxy')
  .action(async function (endpoint) {
    const opts = this.optsWithGlobals<ProgramOptions>();
    await proxy(defaultProgram, { ...opts, proxy: { endpoint } });
    // TODO: should block until terminate?
  });

export type ProxyOptions<TContext extends Record<string, any> = Record<string, any>> =
  ProgramOptions & MeshServeConfigWithProxy<TContext>;

export async function proxy<TContext extends Record<string, any> = Record<string, any>>(
  { log }: Program,
  opts: ProxyOptions<TContext>,
): Promise<AsyncDisposable> {
  const loadedConfig = await loadConfig<TContext>({ log, configPath: opts.configPath });

  const config = {
    ...loadedConfig,
    ...opts,
    proxy: {
      ...loadedConfig['proxy'],
      ...opts.proxy,
    },
    // TODO: make sure there are no other definitions like `hive` or `supergraph` or `subgraph`
  };

  log.info(`Proxying requests to ${config.proxy.endpoint!}`);

  const runtime = createServeRuntime(config);

  return startServerForRuntime(runtime, {
    ...config,
    log: defaultProgram.log,
  });
}
