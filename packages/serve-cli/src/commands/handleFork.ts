import cluster, { type Worker } from 'node:cluster';
import type { Logger } from '@graphql-mesh/types';
import { registerTerminateHandler } from '@graphql-mesh/utils';

export function handleFork(log: Logger, config: { fork?: number }): boolean {
  if (cluster.isPrimary && config.fork > 1) {
    const workers = new Set<Worker>();
    let expectedToExit = false;
    log.debug(`Forking ${config.fork} workers`);
    for (let i = 0; i < config.fork; i++) {
      const worker = cluster.fork();
      worker.once('exit', (code, signal) => {
        if (expectedToExit) {
          log.debug(`Worker ${worker.process.pid} exited with code ${code} and signal ${signal}`);
        } else {
          log.warn(`Worker ${worker.process.pid} exited unexpectedly with code ${code} and signal ${signal}\n
A restart is recommended to ensure the stability of the service`);
        }
        workers.delete(worker);
        if (!expectedToExit && workers.size === 0) {
          log.error(`All workers exited unexpectedly. Exiting`);
          process.exit(1);
        }
      });
      workers.add(worker);
    }
    registerTerminateHandler(signal => {
      log.info(`Killing workers with ${signal}`);
      expectedToExit = true;
      workers.forEach(w => {
        w.kill(signal);
      });
    });
    return true;
  }
  return false;
}
