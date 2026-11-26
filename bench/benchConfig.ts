import type { BenchOptions } from 'vitest';

function envNum(name: string): number | undefined {
  const raw = process.env[name];
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

const isCI = process.env.CI === 'true' || process.env.CI === '1';

const duration = envNum('BENCH_DURATION') ?? (isCI ? 30_000 : 3_000);
const warmupTime = envNum('BENCH_WARMUP_TIME') ?? (isCI ? 5_000 : 300);
const warmupIterations = envNum('BENCH_WARMUP_ITERATIONS') ?? (isCI ? 10 : 3);

/** Vitest bench options (ported from Hive Gateway `@internal/testing`). */
export const benchConfig: BenchOptions = {
  time: duration,
  warmupTime,
  warmupIterations,
  throws: true,
};
