/**
 * generate-config-schema resolves @graphql-tools/wrap from the workspace.
 * After a clean (or on a fresh CI checkout) wrap has no dist yet.
 *
 * A full `bob build` also compiles @graphql-mesh/types, which imports the
 * generated (gitignored) config-schema.ts — so we write a stub first, then
 * build. generate-config-schema regenerates the real schema afterwards.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wrapEntry = join(root, 'packages/wrap/dist/cjs/index.js');

if (existsSync(wrapEntry)) {
  process.exit(0);
}

const stubPath = join(root, 'packages/legacy/types/src/config-schema.ts');
if (!existsSync(stubPath)) {
  writeFileSync(stubPath, 'export const jsonSchema: any = {} as any;\n');
}

const result = spawnSync('yarn', ['bob', 'build'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 1);
