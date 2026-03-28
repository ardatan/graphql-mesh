declare interface ObjectConstructor {
  keys<T>(obj: T): Array<keyof T>;
}
declare module 'ajv-formats';
declare module 'dnscache';
declare module 'json-bigint-patch';

declare module 'newrelic' {
  const shim: any;
  function startWebTransaction(url: string, callback: () => Promise<void>): void;
}

declare module 'newrelic/*' {
  export = shim;
}

declare module '@newrelic/test-utilities' {
  export const TestAgent: any;
}

declare var __VERSION__: string | undefined;
declare var __PACKED_DEPS_PATH__: string | undefined;

// Ambient declarations for PostGraphile v5 subpath exports.
// These act as fallbacks for `moduleResolution: node` (used in tsconfig.build.json)
// which cannot resolve package `exports` subpath entries.
// With `moduleResolution: bundler` (tsconfig.json) the actual package types take
// precedence and these declarations are ignored.
declare module 'postgraphile/presets/amber' {
  export const PostGraphileAmberPreset: GraphileConfig.Preset;
  export default PostGraphileAmberPreset;
}

declare module '@dataplan/pg/adaptors/pg' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function makePgService(
    opts: any,
  ): GraphileConfig.PgServiceConfiguration<'@dataplan/pg/adaptors/pg'>;
}

// Ensure GraphileConfig.PgAdaptors is aware of the `@dataplan/pg/adaptors/pg`
// adaptor key even when the subpath cannot be resolved via `moduleResolution: node`.
// Without this augmentation, `keyof GraphileConfig.PgAdaptors` evaluates to `never`,
// which makes `GraphileConfig.Preset.pgServices` element type `never[]`, causing
// TypeScript 6's stricter `any`-to-`never` assignment check to fail (TS2322).
declare namespace GraphileConfig {
  interface PgAdaptors {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    '@dataplan/pg/adaptors/pg': {
      adaptorSettings: any;
      makePgServiceOptions: any;
      client: any;
    };
  }
}
