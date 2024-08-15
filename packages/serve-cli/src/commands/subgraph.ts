import cluster, { type Worker } from 'node:cluster';
import { lstat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import {
  createServeRuntime,
  type MeshServeConfigSubgraph,
  type UnifiedGraphConfig,
} from '@graphql-mesh/serve-runtime';
import { isUrl, registerTerminateHandler } from '@graphql-mesh/utils';
import { isValidPath } from '@graphql-tools/utils';
import {
  defaultOptions,
  type AddCommand,
  type CLIContext,
  type CLIGlobals,
  type MeshServeCLIConfig,
} from '../cli.js';
import { loadConfig } from '../config.js';
import { startServerForRuntime } from '../server.js';

export const addCommand: AddCommand = (ctx, cli) =>
  cli
    .command('subgraph')
    .description(
      'serve a Federation subgraph that can be used with any Federation compatible router like Mesh Serve or Apollo Router',
    )
    .argument(
      '[schemaPathOrUrl]',
      'path to the subgraph schema file or a url from where to pull the subgraph schema (default: "subgraph.graphql")',
    )
    .action(async function subgraph(schemaPathOrUrl) {
      const { maskedErrors, hiveRegistryToken, polling, nativeImport, ...opts } =
        this.optsWithGlobals<CLIGlobals>();
      const loadedConfig = await loadConfig({
        log: ctx.log,
        configPath: opts.configPath,
        quiet: !cluster.isPrimary,
        nativeImport,
      });

      let subgraph: UnifiedGraphConfig = 'subgraph.graphql';
      if (schemaPathOrUrl) {
        subgraph = schemaPathOrUrl;
      } else if ('subgraph' in loadedConfig) {
        subgraph = loadedConfig.subgraph;
      }

      const config: SubgraphConfig = {
        ...defaultOptions,
        ...loadedConfig,
        ...opts,
        ...(hiveRegistryToken
          ? {
              reporting: {
                ...loadedConfig.reporting,
                type: 'hive',
                token: hiveRegistryToken,
              },
            }
          : {}),
        ...(polling ? { pollingInterval: polling } : {}),
        subgraph,
        logging: loadedConfig.logging ?? ctx.log,
      };
      if (maskedErrors != null) {
        // overwrite masked errors from loaded config only when provided
        config.maskedErrors = maskedErrors;
      }
      if (typeof config.pollingInterval === 'number' && config.pollingInterval < 10_000) {
        process.stderr.write(
          `error: polling interval duration too short, use at least 10 seconds\n`,
        );
        process.exit(1);
      }
      return runSubgraph(ctx, config);
    });

export type SubgraphConfig = MeshServeConfigSubgraph<unknown> & MeshServeCLIConfig;

export async function runSubgraph({ log }: CLIContext, config: SubgraphConfig) {
  let absSchemaPath: string | null = null;
  if (
    typeof config.subgraph === 'string' &&
    isValidPath(config.subgraph) &&
    !isUrl(config.subgraph)
  ) {
    const subgraphPath = config.subgraph;
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
    log.info(`Serving local subgraph from ${absSchemaPath}`);
  } else if (isUrl(String(config.subgraph))) {
    log.info(`Serving remote subgraph from ${config.subgraph}`);
  } else {
    log.info('Serving subgraph from config');
  }

  await startServerForRuntime(runtime, {
    ...config,
    log,
  });
}
