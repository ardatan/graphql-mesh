// eslint-disable-next-line import/no-nodejs-modules
import { existsSync, writeFileSync } from 'node:fs';
// eslint-disable-next-line import/no-nodejs-modules
import { join } from 'node:path';
import { format } from 'prettier';
import { findConfig } from '@graphql-mesh/cli';
import { getPackage } from '@graphql-mesh/config';
import type { YamlConfig } from '@graphql-mesh/types';
import { defaultImportFn } from '@graphql-mesh/utils';
import {
  migrateLegacyConfig,
  type MigrateLegacyConfigResult,
  type ResolveLegacyPlugin,
} from './migrate.js';

export { migrateLegacyConfig } from './migrate.js';
export type {
  MigrateLegacyConfigOptions,
  MigrateLegacyConfigResult,
  MigrationMessage,
  ResolveLegacyPlugin,
} from './migrate.js';

function camelCase(value: string): string {
  return value.replace(/[-_]+(\w)/g, (_, char: string) => char.toUpperCase());
}

export const createDefaultPluginResolver =
  (cwd: string): ResolveLegacyPlugin =>
  async ({ name }) => {
    try {
      const { resolved: possiblePluginFactory, moduleName } = await getPackage<any>({
        name,
        type: 'plugin',
        importFn: defaultImportFn,
        cwd,
        additionalPrefixes: ['@envelop/', '@graphql-yoga/plugin-', '@escape.tech/graphql-armor-'],
      });
      if (typeof possiblePluginFactory === 'function') {
        const fnName = camelCase(`use_${name}`);
        return {
          moduleName,
          importName: `default as ${fnName}`,
          factoryName: fnName,
        };
      }
      const importName = Object.keys(possiblePluginFactory || {}).find(
        iName =>
          (iName.toString().startsWith('use') || iName.toString().endsWith('Plugin')) &&
          typeof possiblePluginFactory[iName] === 'function',
      );
      if (!importName) {
        return undefined;
      }
      return {
        moduleName,
        importName: importName.toString(),
        factoryName: importName.toString(),
      };
    } catch {
      return undefined;
    }
  };

export async function run(argv = process.argv): Promise<MigrateLegacyConfigResult> {
  const args = argv.slice(2).filter(arg => arg !== '--');
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const positional = args.filter(arg => !arg.startsWith('--'));
  const cwd = positional[0] || process.cwd();

  const {
    config: legacyConfig,
    filepath,
    isEmpty,
  }: {
    config?: YamlConfig.Config;
    filepath?: string;
    isEmpty?: boolean;
  } = await findConfig({
    initialLoggerPrefix: 'Mesh Config Migrate',
    dir: cwd,
  });
  if (isEmpty || !legacyConfig) {
    console.error('No config file found');
    process.exitCode = 1;
    return {
      code: '',
      addedPackages: [],
      removedPackages: [],
      messages: [{ level: 'error', message: 'No config file found' }],
      fatal: true,
    };
  }
  console.log(`Found config at ${filepath}`);

  const result = await migrateLegacyConfig(legacyConfig, {
    cwd,
    resolvePlugin: createDefaultPluginResolver(cwd),
  });
  result.code = await format(result.code, { parser: 'typescript' });

  for (const message of result.messages) {
    if (message.level === 'error') {
      console.error(message.message);
    } else {
      console.warn(message.message);
    }
  }

  if (result.fatal) {
    console.error('Migration did not write mesh.config.ts because of the errors above.');
    process.exitCode = 1;
    return result;
  }

  const newConfigPath = join(cwd, 'mesh.config.ts');
  if (!dryRun) {
    if (existsSync(newConfigPath) && !force) {
      console.error(
        `${newConfigPath} already exists. Pass --force to overwrite, or --dry-run to print the result.`,
      );
      process.exitCode = 1;
      return result;
    }
    writeFileSync(newConfigPath, result.code);
  } else {
    process.stdout.write(result.code);
  }

  console.log('Migration successful!');
  console.log(' ');
  if (!dryRun) {
    console.log(`New config file created at ${newConfigPath}`);
    console.log(' ');
  }
  console.log('Please make sure to install the following packages in package.json:');
  for (const packageName of result.addedPackages) {
    console.log(`- ${packageName}`);
  }
  console.log(' ');
  console.log('Please make sure to remove the following packages in package.json:');
  for (const packageName of result.removedPackages) {
    console.log(`- ${packageName}`);
  }
  console.log(' ');
  console.log(
    `Then run "npx mesh-compose -o supergraph.graphql" to generate the supergraph schema!`,
  );
  console.log(`Finally, run "npx hive-gateway supergraph" to start the gateway server!`);
  return result;
}
