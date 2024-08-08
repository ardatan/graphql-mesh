import cluster, { Worker } from 'node:cluster';
import { lstat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { createServeRuntime, type MeshServeConfigWithSubgraph } from '@graphql-mesh/serve-runtime';
import { registerTerminateHandler } from '@graphql-mesh/utils';
import type { AddCommand, CLIContext, CLIGlobals } from '../cli.js';
import { loadConfig } from '../config.js';
import { startServerForRuntime, type ServerConfig } from '../server.js';

export const addCommand: AddCommand = (ctx, cli) =>
  cli
    .command('subgraph')
    .description(
      'serve a Federation subgraph that can be used with any Federation compatible router like Mesh Serve or Apollo Router',
    )
    .argument('[schemaPath]', 'path to the subgraph schema file', 'subgraph.graphql')
    .action(async function (schemaPath) {
      const opts = this.optsWithGlobals<CLIGlobals>();
      const loadedConfig = await loadConfig({
        log: ctx.log,
        configPath: opts.configPath,
        quiet: !cluster.isPrimary,
      });
      const config: SubgraphConfig = {
        ...loadedConfig,
        ...opts,
        fork: opts.fork!, // defaults are defined in global cli options
        host: opts.host!, // defaults are defined in global cli options
        port: opts.port!, // defaults are defined in global cli options
        subgraph: schemaPath,
      };
      return subgraph(ctx, config);
    });

export type SubgraphConfig = MeshServeConfigWithSubgraph<unknown> &
  ServerConfig & {
    fork: number;
  };

export async function subgraph({ log }: CLIContext, config: SubgraphConfig) {
  let absSchemaPath: string | null = null;
  if (typeof config.subgraph === 'undefined' || typeof config.subgraph === 'string') {
    const subgraphPath = config.subgraph || 'subgraph.graphql';
    absSchemaPath = isAbsolute(subgraphPath)
      ? String(subgraphPath)
      : resolve(process.cwd(), subgraphPath);
    try {
      await lstat(absSchemaPath);
    } catch {
      throw new Error(`Subgraph schema at ${absSchemaPath} does not exist`);
    }
  }

  if (cluster.isPrimary && config.fork > 1) {
    const workers: Worker[] = [];
    log.info(`Forking ${config.fork} workers`);
    for (let i = 0; i < config.fork; i++) {
      workers.push(cluster.fork());
    }
    registerTerminateHandler(signal => {
      log.info(`Killing workers with ${signal}`);
      workers.forEach(w => {
        w.kill(signal);
      });
    });
    return;
  }

  const runtime = createServeRuntime(config);

  if (absSchemaPath) {
    log.info(`Serving subgraph from ${absSchemaPath}`);
  } else {
    log.info('Serving subgraph from config');
  }

  await startServerForRuntime(runtime, {
    ...config,
    log,
  });
}
