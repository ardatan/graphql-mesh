/** Local env helpers (ported from Gateway internal/env; no ~internal alias). */
export function getEnvStr(
  key: string,
  opts: { globalThis?: Record<string, any> } = {},
): string | undefined {
  const globalThat: Record<string, any> = opts.globalThis ?? (globalThis as any);
  let variable: string | undefined =
    globalThat.process?.env?.[key] ||
    globalThat.env?.[key] ||
    globalThat.Deno?.env?.get(key) ||
    globalThat[key];
  if (variable != null) {
    variable += '';
  } else {
    variable = undefined;
  }
  return variable?.trim();
}

export function isBrowser() {
  return typeof window !== 'undefined';
}

/** Prefer passing handleUnifiedGraph from the host; kept for API parity with Gateway builds. */
export function usingHiveRouterRuntime(): boolean {
  const v = (typeof process !== 'undefined' && process.env?.HIVE_ROUTER_RUNTIME) || '';
  return ['1', 't', 'true', 'y', 'yes', 'on', 'enabled'].includes(String(v).toLowerCase());
}
