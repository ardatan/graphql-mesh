---
"@graphql-mesh/incontext-sdk-codegen": patch
---
**Motivation:** The Hive group bump pulled `@graphql-tools/wrap@11.2.5` (and `delegate@12.3.3`) while this package still used patched `@graphql-mesh/fusion-runtime@1.13.3` (`delegate@12.3.2`). Typecheck then failed because `wrapSchema(getSubschema(...))` mixed two incompatible `SubschemaConfig` types from nested vs top-level `@graphql-tools/delegate`.

**What changed:** Bump patched `@graphql-mesh/fusion-runtime` to `1.13.4` (same `iterateAsync` patch, now against the Hive release that already depends on `delegate@^12.3.3`), and take the matching Hive transport/wrap patch bumps.

**Before:**
```ts
// fusion-runtime@1.13.3 → nested @graphql-tools/delegate@12.3.2
// wrap@11.2.5 → @graphql-tools/delegate@12.3.3
const transformedSchema = mapSchema(wrapSchema(getSubschema(sourceName)), /* ... */);
// TS2345: SubschemaConfig from 12.3.2 is not assignable to wrap's 12.3.3 type
```

**After:**
```ts
// fusion-runtime@1.13.4 + wrap@11.2.5 share @graphql-tools/delegate@12.3.3
const transformedSchema = mapSchema(wrapSchema(getSubschema(sourceName)), /* ... */);
```

dependencies updates:
  - Updated dependency [`@graphql-mesh/fusion-runtime@1.13.4` (patched) ↗︎](https://www.npmjs.com/package/@graphql-mesh/fusion-runtime/v/1.13.4) (from patched `1.13.3`, in `dependencies`)
  - Updated dependency [`@graphql-mesh/transport-common@^1.1.2` ↗︎](https://www.npmjs.com/package/@graphql-mesh/transport-common/v/1.1.2) (from `^1.1.1`, in `dependencies`)
  - Updated dependency [`@graphql-tools/wrap@^11.2.5` ↗︎](https://www.npmjs.com/package/@graphql-tools/wrap/v/11.2.5) (from `^11.2.4`, in `dependencies`)
