// #9658: deterministic source-work replay; never contacts services or reads environment files.
const { spawnSync } = require('node:child_process');
const { writeFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const build = spawnSync(
  process.execPath,
  [
    path.join(
      path.dirname(require.resolve('@typescript/native-preview/package.json')),
      'bin/tsgo.js',
    ),
    '-p',
    path.join(__dirname, 'tsconfig.json'),
  ],
  { stdio: 'inherit' },
);
if (build.status !== 0) process.exit(build.status ?? 1);
mkdirSync(path.join(__dirname, '.build'), { recursive: true });
writeFileSync(path.join(__dirname, '.build/package.json'), '{"type":"commonjs"}');
const run = spawnSync(process.execPath, [path.join(__dirname, 'concurrent.cjs')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    BENCHMARK_NODES: '3',
    BENCHMARK_FIXTURE: 'census',
    BENCHMARK_PRODUCTS: '4614',
    BENCHMARK_DURATION: '3600',
    BENCHMARK_WARMUP: '2700',
    BENCHMARK_PROCESSES: '1',
    BENCHMARK_EDITS_PER_HOUR: '9.228',
    BENCHMARK_PROFILES: 'legacy:60,generic:86400',
    BENCHMARK_POLICY_PROPOSAL: 'upstream',
    BENCHMARK_TAG: 'reproduction',
  },
});
process.exit(run.status ?? 1);
