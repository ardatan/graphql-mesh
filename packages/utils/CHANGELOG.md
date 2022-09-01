# @graphql-mesh/utils

## 0.41.0

### Minor Changes

- [#4396](https://github.com/Urigo/graphql-mesh/pull/4396) [`df37c40f4`](https://github.com/Urigo/graphql-mesh/commit/df37c40f47c6c53949f5d5f71e062c09fe5e1bd0) Thanks [@ardatan](https://github.com/ardatan)! - Drop webhook plugin and automatically handle webhooks. See the documentation for more information

- [#4404](https://github.com/Urigo/graphql-mesh/pull/4404) [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f) Thanks [@ardatan](https://github.com/ardatan)! - New `onFetch` hook!

### Patch Changes

- [#4380](https://github.com/Urigo/graphql-mesh/pull/4380) [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd) Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:

  - Updated dependency [`@graphql-tools/delegate@9.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.4) (from `9.0.3`, in `dependencies`)
  - Updated dependency [`@graphql-tools/utils@8.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.1) (from `8.10.0`, in `dependencies`)

- [#4389](https://github.com/Urigo/graphql-mesh/pull/4389) [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/delegate@9.0.4` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.4) (from `9.0.3`, in `dependencies`)
  - Updated dependency [`@graphql-tools/utils@8.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.1) (from `8.10.0`, in `dependencies`)

- Updated dependencies [[`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f), [`df37c40f4`](https://github.com/Urigo/graphql-mesh/commit/df37c40f47c6c53949f5d5f71e062c09fe5e1bd0), [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f), [`7a4023a2c`](https://github.com/Urigo/graphql-mesh/commit/7a4023a2cac2dacc8e78e10dabee65427b9a5e54), [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f)]:
  - @graphql-mesh/cross-helpers@0.2.3
  - @graphql-mesh/types@0.81.0

## 0.40.0

### Minor Changes

- [#4356](https://github.com/Urigo/graphql-mesh/pull/4356) [`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824) Thanks [@ardatan](https://github.com/ardatan)! - ## Improvements on outgoing HTTP calls

  - Now Mesh's default fetch implementation deduplicates the same GET JSON requests in the same execution context
  - You should pass `Accept: application/json` to make this work.
  - JSON Schema, new OpenAPI and RAML handlers now take GraphQL context as 3rd parameter. If you use `customFetch`, you can use that value to access Mesh internals such as the incoming `Request` object.

  ## HTTP Details in extensions for tracking HTTP calls

  You can add `includeHttpDetailsInExtensions: true` to your configuration file to get more information about HTTP calls done by Mesh during the execution in `extensions` field of the response.

  ![image](https://user-images.githubusercontent.com/20847995/186371035-6a327a2e-c74d-4bf4-a78f-6814b1001501.png)

### Patch Changes

- [#4356](https://github.com/Urigo/graphql-mesh/pull/4356) [`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824) Thanks [@ardatan](https://github.com/ardatan)! - dependencies updates:

  - Added dependency [`fetchache@0.1.2` ↗︎](https://www.npmjs.com/package/fetchache/v/0.1.2) (to `dependencies`)
  - Added dependency [`@whatwg-node/fetch@0.3.2` ↗︎](https://www.npmjs.com/package/@whatwg-node/fetch/v/0.3.2) (to `dependencies`)

- Updated dependencies [[`be79b20a5`](https://github.com/Urigo/graphql-mesh/commit/be79b20a59b14d5d79bfeb260e4ecabc58c26efb)]:
  - @graphql-mesh/types@0.80.2

## 0.39.0

### Minor Changes

- [#4353](https://github.com/Urigo/graphql-mesh/pull/4353) [`f23e14eba`](https://github.com/Urigo/graphql-mesh/commit/f23e14ebaf7c6a869207edc43b0e2a8114d0d21f) Thanks [@ardatan](https://github.com/ardatan)! - Now CLI reports critical errors with stack traces even if DEBUG isn't enabled, and error messages are no longer trimmed.

  ```diff
  Schema couldn't be generated because of the following errors:
  - - Foo bar is n...
  + - Foo bar is not valid
  + at /somepath/somejsfile.js:123:2
  + at /someotherpath/someotherjs.file:232:4
  ```

### Patch Changes

- Updated dependencies []:
  - @graphql-mesh/types@0.80.1

## 0.38.1

### Patch Changes

- Updated dependencies [[`f882aca38`](https://github.com/Urigo/graphql-mesh/commit/f882aca388380ad9dff1d618424e8a36b8607319)]:
  - @graphql-mesh/types@0.80.0

## 0.38.0

### Minor Changes

- [#4235](https://github.com/Urigo/graphql-mesh/pull/4235) [`b162269f7`](https://github.com/Urigo/graphql-mesh/commit/b162269f70a90594962792ffaaa40d3a7ee9f4e4) Thanks [@gilgardosh](https://github.com/gilgardosh)! - - Support "$request.query" and "$request.path" usages in [OpenAPI runtime expressions](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#runtimeExpression)

  - Fix `Field not found` error when an OpenAPI link refers to an operation which is not `Mutation`
  - Do not use AJV and check field names in the received object to resolve the type name for a union field
  - Fix `queryParams` which allows you to pass query parameters for all operations
  - Handle cookie paramters correctly defined in the OpenAPI document by trimming empty values
  - Respect the mime types defined in the OpenAPI document. Now it creates a union for each mime type defined in the document, and resolve it by the mime type.
  - Respect JSON examples given in the OpenAPI document correctly even if they are strings with JSON content.
  - Normalize(lowercase header names) and merge final operation headers correctly from different places `operationHeaders` from the bundle and configuration plus `headers` defined for that specific operation.
  - Do not ignore operationHeaders defined in the configuration even if there are some already defined in the bundle

  **BREAKING CHANGES:**

  - If a JSON Schema type cannot be represented in GraphQL (object without properties etc.), it will no longer use `Any` type but `JSON` type instead which is a scalar from `graphql-scalars`.

  - Due to the improvements in `healJSONSchema` some of types that are not named in the JSON Schema might be named in a different way. Please make sure the content of the types are correct and report us on GitHub if they are represented incorrectly.

  - UUID format is now represented as `UUID` scalar type which is a scalar from `graphql-scalars`.

  - HTTP Errors are now in a more descriptive way. If your consumer respects them strictly, they will probably need to update their implementation.

  ```diff
  {
    "url": "http://www.google.com/api",
    "method": "GET",
  - "status": 401,
  + "statusCode": 401,
  + "statusText": "Unauthorized",
  - "responseJson": {}
  + "responseBody": {}
  }
  ```

  - `requestSchema` and `requestSample` are no longer used for query parameters in GET operations, but instead we introduced new `argTypeMap` and `queryParamsArgMap` to define schemas for query parameters.

  For JSON Schema Handler configuration, the following changes are **NEEDED**;

  ```diff
  - requestSample: { some_flag: true }
  + queryParamsArgMap:
  +   some_flag: some_flag
  + argTypeMap:
  +   some_flag:
  +     type: boolean
  ```

  or just use the string interpolation;

  ```yaml
  path: /mypath?some_flag={args.some_flag}
  ```

  - Query parameters no longer uses `input`, and they become an argument of that operation directly.

  In the generated GraphQL Schema;

  ```diff
  - someOp(input: SomeInput): OpResult
  - input SomeInput {
  -  some_flag: Boolean
  - }
  + someOp(some_flag: Boolean): OpResult
  ```

  - `argTypeMap` no longer takes GraphQL type names but instead it can take JSON Schema pointer or JSON Schema definition itself. New `argTypeMap` can configure any argument even if it is defined in the headers.

  ```diff
  argTypeMap:
  - some_flag: Boolean
  + some_flag:
  +   type: boolean
  ```

### Patch Changes

- Updated dependencies [[`b162269f7`](https://github.com/Urigo/graphql-mesh/commit/b162269f70a90594962792ffaaa40d3a7ee9f4e4), [`2ad667d96`](https://github.com/Urigo/graphql-mesh/commit/2ad667d964545ed47170cfa4f9393282edc2073b)]:
  - @graphql-mesh/types@0.79.0
  - @graphql-mesh/string-interpolation@0.3.2

## 0.37.9

### Patch Changes

- [#4275](https://github.com/Urigo/graphql-mesh/pull/4275) [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/delegate@9.0.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.1) (was `9.0.0`, in `dependencies`)
  - Updated dependency [`@graphql-tools/utils@8.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.0) (was `8.9.1`, in `dependencies`)

* [#4298](https://github.com/Urigo/graphql-mesh/pull/4298) [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/delegate@9.0.3` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.3) (was `9.0.1`, in `dependencies`)

* Updated dependencies [[`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968)]:
  - @graphql-mesh/cross-helpers@0.2.2
  - @graphql-mesh/string-interpolation@0.3.1
  - @graphql-mesh/types@0.78.8

## 0.37.8

### Patch Changes

- [#4263](https://github.com/Urigo/graphql-mesh/pull/4263) [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/delegate@9.0.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/delegate/v/9.0.0) (was `8.8.1`, in `dependencies`)
  - Updated dependency [`@graphql-tools/utils@8.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.9.1) (was `8.9.0`, in `dependencies`)

- Updated dependencies [[`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)]:
  - @graphql-mesh/cross-helpers@0.2.1
  - @graphql-mesh/types@0.78.7

## 0.37.7

### Patch Changes

- [#4237](https://github.com/Urigo/graphql-mesh/pull/4237) [`02c018249`](https://github.com/Urigo/graphql-mesh/commit/02c0182498e60c78bee5c44c42dc897a739e8f18) Thanks [@ardatan](https://github.com/ardatan)! - - Respect `pattern` of `number` types
  - Dereference first-level circular dependencies properly in `dereferenceObject`
  - Do not make the schema single if there is one `allOf` or `anyOf` element but with properties
- Updated dependencies [[`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b)]:
  - @graphql-mesh/types@0.78.6

## 0.37.6

### Patch Changes

- Updated dependencies [c88a34d82]
  - @graphql-mesh/types@0.78.5

## 0.37.5

### Patch Changes

- 30d046724: Fix critical issue when there is a single source with a "bare" transform
  - @graphql-mesh/types@0.78.4

## 0.37.4

### Patch Changes

- Updated dependencies [738e2f378]
  - @graphql-mesh/types@0.78.3

## 0.37.3

### Patch Changes

- a2ef35c35: ** Use the new `@whatwg-node/fetch` package instead of `cross-undici-fetch`**

  `cross-undici-fetch` has been renamed to `@whatwg-node-fetch`. Now Mesh uses this new package.

  ** BREAKING: Drop `serve.handlers` in favor of the new plugin system **

  Now Mesh uses the new plugin system of GraphQL Yoga that uses WHATWG Fetch API instead of Node specific `serve.handlers`. That means you can use those plugins with any environment even if you are not using Node.js with `mesh start`.

  Please check our docs to see how you can migrate to the new usage.
  https://www.graphql-mesh.com/docs/guides/subscriptions-webhooks#handle-webhook-http-requests

- Updated dependencies [a2ef35c35]
  - @graphql-mesh/types@0.78.2

## 0.37.2

### Patch Changes

- @graphql-mesh/types@0.78.1

## 0.37.1

### Patch Changes

- 6e6fd4ab7: Fix path resolution issue on `readFileOrUrl` that causes a bug while loading files from the file system for building artifacts
- Updated dependencies [bcd9355ee]
  - @graphql-mesh/types@0.78.0

## 0.37.0

### Minor Changes

- 0401c7617: **Improvements on string interpolation ({env.sth} or {context.headers.sth}) for different environments**

  As we mention in most of our docs, we usually expect a key-value `header` object in the context.
  But Fetch-like environments don't have this kind of object but instead `Headers` object which is a kind `Map`.
  Now Mesh can detect this and automatically convert it to the key-value object especially for Yoga users.

  Also Mesh now handles `env` in a better way for non-Node environments;

  Consider `import.meta.env` as `env` if available, else take `globalThis` as `env`.

### Patch Changes

- Updated dependencies [66f5d0189]
- Updated dependencies [0401c7617]
  - @graphql-mesh/types@0.77.1
  - @graphql-mesh/cross-helpers@0.2.0

## 0.36.1

### Patch Changes

- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
  - @graphql-mesh/cross-helpers@0.1.7
  - @graphql-mesh/types@0.77.0

## 0.36.0

### Minor Changes

- a0950ac6f: Breaking Change:

  - Now you can set a global `customFetch` instead of setting `customFetch` individually for each handler. `customFetch` configuration field for each handler will no longer work. And also `customFetch` needs to be the path of the code file that exports the function as `default`. `moduleName#exportName` is not supported for now.

  - While programmatically creating the handlers, now you also need `fetchFn` to be passed to the constructor;

  ```ts
  new GraphQLHandler({
    ...,
    fetchFn: myFetchFn,
  })
  ```

  - `readFileOrUrl`'s second `config` parameter is now required. Also this second parameter should take an object with `cwd`, `importFn`, `fetch` and `logger`. You can see the diff of handler's codes as an example.

### Patch Changes

- 19d06f6c9: Replace micromatch with minimatch and remove file-path-to-url because both has Node specific dependencies which need polyfills and extra setup for non Node environments
- 19d06f6c9: Remove chalk dependency
- Updated dependencies [a0950ac6f]
  - @graphql-mesh/types@0.76.0

## 0.35.7

### Patch Changes

- Updated dependencies [d4754ad08]
- Updated dependencies [2df026e90]
  - @graphql-mesh/types@0.75.0

## 0.35.6

### Patch Changes

- ed9ba7f48: Small improvements for relaxing event loop
- Updated dependencies [ed9ba7f48]
  - @graphql-mesh/types@0.74.2

## 0.35.5

### Patch Changes

- 41cfb46b4: Dynamically import additional resolvers instead of static imports
  - @graphql-mesh/types@0.74.1

## 0.35.4

### Patch Changes

- Updated dependencies [13b9b30f7]
  - @graphql-mesh/string-interpolation@0.3.0
  - @graphql-mesh/types@0.74.0

## 0.35.3

### Patch Changes

- 9733f490c: Do not strip long messages if DEBUG mode enabled
  - @graphql-mesh/types@0.73.3

## 0.35.2

### Patch Changes

- 3c0366d2c: - Support import.meta.env instead of process.env for browsers
  - Ponyfill `util.inspect` only if it is not Node env
- 3c0366d2c: Sanitize "." as "\_" instead of "DOT"
- Updated dependencies [3c0366d2c]
  - @graphql-mesh/cross-helpers@0.1.6
  - @graphql-mesh/types@0.73.2

## 0.35.1

### Patch Changes

- abe9fcc41: fix(fileURLtoPath): return empty string if url is not valid
  - @graphql-mesh/types@0.73.1

## 0.35.0

### Minor Changes

- 974e703e2: No longer import entire lodash library but instead individual smaller packages

### Patch Changes

- 974e703e2: Cleanup dependencies
- 974e703e2: Use deeper lodash imports to have better treeshaking and avoid using eval
- Updated dependencies [974e703e2]
- Updated dependencies [19a99c055]
- Updated dependencies [974e703e2]
- Updated dependencies [974e703e2]
- Updated dependencies [893d526ab]
- Updated dependencies [974e703e2]
  - @graphql-mesh/string-interpolation@0.2.0
  - @graphql-mesh/types@0.73.0
  - @graphql-mesh/cross-helpers@0.1.5

## 0.34.10

### Patch Changes

- 43eb3d2c2: fix(additionalResolvers): check if result type matches the abstract source type by respecting interface inheritance
  - @graphql-mesh/types@0.72.5

## 0.34.9

### Patch Changes

- 55ad5ea44: Fix browser support
- Updated dependencies [55ad5ea44]
  - @graphql-mesh/cross-helpers@0.1.4
  - @graphql-mesh/types@0.72.4

## 0.34.8

### Patch Changes

- 31efa964e: Fix ESM support
  - @graphql-mesh/types@0.72.3

## 0.34.7

### Patch Changes

- Updated dependencies [66b9b3ddc]
  - @graphql-mesh/cross-helpers@0.1.3
  - @graphql-mesh/types@0.72.2

## 0.34.6

### Patch Changes

- b9beacca2: Bump cross-undici-fetch for Node 14 compatibility and performance improvements
  - @graphql-mesh/types@0.72.1

## 0.34.5

### Patch Changes

- Updated dependencies [fa2542468]
  - @graphql-mesh/types@0.72.0

## 0.34.4

### Patch Changes

- ddbbec8a8: Supress dynamic import warnings in Vite
  - @graphql-mesh/types@0.71.4

## 0.34.3

### Patch Changes

- 2e9addd80: Bump cross-undici-fetch for Node 18 compat
- Updated dependencies [2e9addd80]
- Updated dependencies [2e9addd80]
  - @graphql-mesh/string-interpolation@0.1.0
  - @graphql-mesh/types@0.71.3

## 0.34.2

### Patch Changes

- @graphql-mesh/types@0.71.2

## 0.34.1

### Patch Changes

- 7856f92d3: Bump all packages
- Updated dependencies [7856f92d3]
  - @graphql-mesh/cross-helpers@0.1.2
  - @graphql-mesh/string-interpolation@0.0.1
  - @graphql-mesh/types@0.71.1

## 0.34.0

### Minor Changes

- f963b57ce: Improve Logging Experience
- 0644f31f2: Use dayjs instead of date-fns for smaller bundle size
- 331b62637: feat(utils): add base64 modifier to string interpolator
- 331b62637: feat(json-schema/openapi): support OpenAPI links and json pointer syntax in string interpolation
- 331b62637: feat: support JSON string as an input for string file pointers

### Patch Changes

- Updated dependencies [f963b57ce]
- Updated dependencies [331b62637]
  - @graphql-mesh/types@0.71.0

## 0.33.6

### Patch Changes

- Updated dependencies [cf0836a64]
  - @graphql-mesh/cross-helpers@0.1.1
  - @graphql-mesh/types@0.70.6

## 0.33.5

### Patch Changes

- @graphql-mesh/types@0.70.5

## 0.33.4

### Patch Changes

- 35a55e841: Bump GraphQL Tools packages
- Updated dependencies [35a55e841]
  - @graphql-mesh/types@0.70.4

## 0.33.3

### Patch Changes

- @graphql-mesh/types@0.70.3

## 0.33.2

### Patch Changes

- Updated dependencies [b02f5b008]
  - @graphql-mesh/types@0.70.2

## 0.33.1

### Patch Changes

- 2d5c6c72a: add Git repository link in package.json
- Updated dependencies [2d5c6c72a]
  - @graphql-mesh/types@0.70.1

## 0.33.0

### Minor Changes

- d567be7b5: feat(json-schema): support bundles from different sources

### Patch Changes

- Updated dependencies [d567be7b5]
  - @graphql-mesh/types@0.70.0

## 0.32.2

### Patch Changes

- Updated dependencies [f30dba61e]
  - @graphql-mesh/types@0.69.0

## 0.32.1

### Patch Changes

- Updated dependencies [be61de529]
  - @graphql-mesh/types@0.68.3

## 0.32.0

### Minor Changes

- 67fb11706: enhance: improve cross-platform support

### Patch Changes

- Updated dependencies [b1a6df928]
  - @graphql-mesh/types@0.68.2

## 0.31.0

### Minor Changes

- b2c537c2a: feat - cross-platform support

### Patch Changes

- Updated dependencies [b2c537c2a]
  - @graphql-mesh/cross-helpers@0.1.0
  - @graphql-mesh/types@0.68.1

## 0.30.2

### Patch Changes

- Updated dependencies [6c318b91a]
  - @graphql-mesh/types@0.68.0

## 0.30.1

### Patch Changes

- @graphql-mesh/types@0.67.1

## 0.30.0

### Minor Changes

- 01bac6bb5: enhance: reduce memory consumption

### Patch Changes

- 01bac6bb5: fix - align graphql-tools versions
- Updated dependencies [01bac6bb5]
- Updated dependencies [01bac6bb5]
  - @graphql-mesh/types@0.67.0

## 0.29.0

### Minor Changes

- 268db0462: feat: persisted queries

### Patch Changes

- @graphql-mesh/types@0.66.6

## 0.28.5

### Patch Changes

- Updated dependencies [2ffb1f287]
  - @graphql-mesh/types@0.66.5

## 0.28.4

### Patch Changes

- Updated dependencies [6d2d46480]
  - @graphql-mesh/types@0.66.4

## 0.28.3

### Patch Changes

- @graphql-mesh/types@0.66.3

## 0.28.2

### Patch Changes

- fb876e99c: fix: bump fixed delegate package
- Updated dependencies [fb876e99c]
  - @graphql-mesh/types@0.66.2

## 0.28.1

### Patch Changes

- Updated dependencies [98ff961ff]
  - @graphql-mesh/types@0.66.1

## 0.28.0

### Minor Changes

- 6f07de8fe: feat(graphql): custom fetch strategies

### Patch Changes

- 6f07de8fe: fix: do not import process from env
- b481fbc39: enhance: add tslib to dependencies to reduce bundle size
- Updated dependencies [6f07de8fe]
- Updated dependencies [6f07de8fe]
- Updated dependencies [b481fbc39]
  - @graphql-mesh/types@0.66.0

## 0.27.9

### Patch Changes

- 3f4bb09a9: fix(applyResultTransforms): apply transformers for result in correct order
- Updated dependencies [21de17a3d]
  - @graphql-mesh/types@0.65.0

## 0.27.8

### Patch Changes

- Updated dependencies [8b8eb5158]
- Updated dependencies [8b8eb5158]
  - @graphql-mesh/types@0.64.2

## 0.27.7

### Patch Changes

- ca6bb5ff3: fix(utils): convert minus character to underscore if in the middle
  - @graphql-mesh/types@0.64.1

## 0.27.6

### Patch Changes

- Updated dependencies [08b250e04]
  - @graphql-mesh/types@0.64.0

## 0.27.5

### Patch Changes

- 1815865c3: fix: bump fixed graphql-tools
- Updated dependencies [1815865c3]
  - @graphql-mesh/types@0.63.1

## 0.27.4

### Patch Changes

- Updated dependencies [b6eca9baa]
- Updated dependencies [b6eca9baa]
  - @graphql-mesh/types@0.63.0

## 0.27.3

### Patch Changes

- Updated dependencies [0d43ecf19]
  - @graphql-mesh/types@0.62.2

## 0.27.2

### Patch Changes

- c71b29004: fix(utils): revert unnecessary change
- Updated dependencies [447bc3697]
  - @graphql-mesh/types@0.62.1

## 0.27.1

### Patch Changes

- fcbd12a35: fix(utils): normalize module objects with Object.defineProperty not with regular assignment
- Updated dependencies [240ec7b38]
  - @graphql-mesh/types@0.62.0

## 0.27.0

### Minor Changes

- 900a01355: Support YAML include

## 0.26.4

### Patch Changes

- Updated dependencies [66ca1a366]
  - @graphql-mesh/types@0.61.0

## 0.26.3

### Patch Changes

- Updated dependencies [a79268b3a]
- Updated dependencies [a79268b3a]
  - @graphql-mesh/types@0.60.0

## 0.26.2

### Patch Changes

- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
  - @graphql-mesh/types@0.59.0

## 0.26.1

### Patch Changes

- 113091148: fix(utils): better error for missing types in incontext sdk
- Updated dependencies [6bb4cf673]
  - @graphql-mesh/types@0.58.0

## 0.26.0

### Minor Changes

- 56e2257fa: feat: use JIT in all execution phases

### Patch Changes

- 56e2257fa: fix(merger-bare): handle single source transforms correctly
- Updated dependencies [1ab0aebbc]
  - @graphql-mesh/types@0.57.2

## 0.25.0

### Minor Changes

- 2b876f2b8: feat(core): re-enable leaf serialization and custom JSON serializer during execution

## 0.24.2

### Patch Changes

- d907351c5: new OpenAPI Handler
- Updated dependencies [d907351c5]
  - @graphql-mesh/types@0.57.1

## 0.24.1

### Patch Changes

- 26d685f2a: fix(pubsub): get correct value from event

## 0.24.0

### Minor Changes

- cfca98d34: feat(utils): drop graphql-subscriptions and use events for PubSub Impl

### Patch Changes

- Updated dependencies [cfca98d34]
  - @graphql-mesh/types@0.57.0

## 0.23.0

### Minor Changes

- 5666484d6: update cross-undici-fetch

## 0.22.2

### Patch Changes

- 6c216c309: fix(readFileOrUrl): read JSON from FS not CJS

## 0.22.1

### Patch Changes

- c22eb1b5e: feat(playground): embed GraphQL Mesh logo in GraphiQL

## 0.22.0

### Minor Changes

- ec0d1d639: enhance: avoid sync require but collect import sync

### Patch Changes

- 1cc0acb9a: fix: normalize imported modules
- Updated dependencies [ec0d1d639]
  - @graphql-mesh/types@0.56.0

## 0.21.1

### Patch Changes

- Updated dependencies [1b332487c]
  - @graphql-mesh/types@0.55.0

## 0.21.0

### Minor Changes

- 875d0e48d: enhance: small improvements

## 0.20.1

### Patch Changes

- Updated dependencies [761b16ed9]
  - @graphql-mesh/types@0.54.1

## 0.20.0

### Minor Changes

- 09f81dd74: GraphQL v16 compatibility
- 09f81dd74: GraphQL v16 compability

### Patch Changes

- Updated dependencies [09f81dd74]
- Updated dependencies [09f81dd74]
  - @graphql-mesh/types@0.54.0

## 0.19.0

### Minor Changes

- 0dc08e5cc: enhance: improve jitExecutorFactory

## 0.18.1

### Patch Changes

- Updated dependencies [6f57be0c1]
  - @graphql-mesh/types@0.53.0

## 0.18.0

### Minor Changes

- 4ec7a14ba: enhance: memoize parse/print document node
- 811960cdc: feat(runtime): use factory functions for debug messages

### Patch Changes

- Updated dependencies [811960cdc]
- Updated dependencies [6f5ffe766]
  - @graphql-mesh/types@0.52.0

## 0.17.2

### Patch Changes

- Updated dependencies [256abf5f7]
  - @graphql-mesh/types@0.51.0

## 0.17.1

### Patch Changes

- Updated dependencies [8c9b709ae]
  - @graphql-mesh/types@0.50.0

## 0.17.0

### Minor Changes

- 7bd145769: feat(utils): use JIT for subscriptions as well

## 0.16.3

### Patch Changes

- 472c5887b: enhance(readFileOrUrl): remove unnecessary caching

## 0.16.2

### Patch Changes

- Updated dependencies [6ce43ddac]
  - @graphql-mesh/types@0.49.0

## 0.16.1

### Patch Changes

- 46a4f7b73: fix(utils): hashObject should always return a string
- aa804d043: enhance(utils): improve rmdirs
- Updated dependencies [67552c8f8]
  - @graphql-mesh/types@0.48.0

## 0.16.0

### Minor Changes

- 9eff8a396: enhance(logging): ability to filter debug messages

### Patch Changes

- Updated dependencies [9eff8a396]
  - @graphql-mesh/types@0.47.0

## 0.15.0

### Minor Changes

- f4f30741d: enhance(artifacts): no more execute additional resolvers during build

## 0.14.0

### Minor Changes

- 4545fe72d: Some improvements on additional resolvers;

  - Now you can point to the nested fields in `keyArgs`; e.g. `keysArg: "where.ids"`
  - You don't need `returnType` for abstract types anymore, because it's inferred from the type of `targetFieldName`.

- d189b4034: feat(json-schema): handle non-latin or non-string values correctly

### Patch Changes

- Updated dependencies [4545fe72d]
- Updated dependencies [f23820ed0]
- Updated dependencies [06d688e70]
  - @graphql-mesh/types@0.46.0

## 0.13.7

### Patch Changes

- fc51c574d: Dependency updates
- Updated dependencies [fc51c574d]
  - @graphql-mesh/types@0.45.2

## 0.13.6

### Patch Changes

- Updated dependencies [1c2667489]
  - @graphql-mesh/types@0.45.1

## 0.13.5

### Patch Changes

- 7080a2f1d: Fix baseDir imports for cli generated artifacts

## 0.13.4

### Patch Changes

- 0c97b4b75: fix(config): Yarn PnP Support
- Updated dependencies [6266d1774]
- Updated dependencies [94606e7b9]
- Updated dependencies [2b8dae1cb]
  - @graphql-mesh/types@0.45.0

## 0.13.3

### Patch Changes

- Updated dependencies [25d10cc23]
  - @graphql-mesh/types@0.44.2

## 0.13.2

### Patch Changes

- 49c8ceb38: fix(core): bump packages to fix variables issue
- Updated dependencies [49c8ceb38]
  - @graphql-mesh/types@0.44.1

## 0.13.1

### Patch Changes

- Updated dependencies [1ee417e3d]
  - @graphql-mesh/types@0.44.0

## 0.13.0

### Minor Changes

- 885ea439a: New MeshStore approach

### Patch Changes

- d8051f87d: use fallbackFormat in readUrlWithCache
- Updated dependencies [885ea439a]
- Updated dependencies [d8051f87d]
  - @graphql-mesh/types@0.43.0

## 0.12.0

### Minor Changes

- bdb58dfec: chore(deps): bump object-hash

## 0.11.4

### Patch Changes

- 7d0e33660: fix(utils): support annotations in argTypeMap

## 0.11.3

### Patch Changes

- 3c4c51100: enhance(runtime): skip validation on schema delegation

## 0.11.2

### Patch Changes

- e6acdbd7d: enhance(runtime): do not compose unnecessary resolvers

## 0.11.1

### Patch Changes

- 69c89666d: chore(utils): bump string interpolator version

## 0.11.0

### Minor Changes

- 1caa8ffd3: enhance(runtime): use graphql-jit to improve the performance

## 0.10.0

### Minor Changes

- 346fe9c61: Performance improvements and OData fixes

## 0.9.2

### Patch Changes

- b77148a04: fix(npm-publish): bump all versions to publish again

## 0.9.1

### Patch Changes

- 2c3312f1a: use fallbackFormat in readUrlWithCache
- d12c7d978: fix(utils): use mkdir before emit output

## 0.9.0

### Minor Changes

- b9ca0c30: Make Transforms and Handlers base-dir aware

## 0.8.8

### Patch Changes

- ec89a923: fix(utils): ensure directory exists in writeJSON

## 0.8.7

### Patch Changes

- 69d2198d: fix readFileWithCache: isAbsolute issue (https://github.com/Urigo/graphql-mesh/issues/1505)

## 0.8.6

### Patch Changes

- 7e970f09: fix(utils): handle more complex interpolation strings

## 0.8.5

### Patch Changes

- 8d345721: fix(utils): fix pathExists issue

## 0.8.4

### Patch Changes

- c767df01: fix(fs): fix fs handling issues for non Node environments
- b3d7ecbf: chore(deps): replace fs-extra with native fs

## 0.8.3

### Patch Changes

- 08c2966e: chore(config): update js-yaml

## 0.8.2

### Patch Changes

- c85a54eb: fix(utils): handle multiple transforms properly

## 0.8.1

### Patch Changes

- c064e3a8: Fix minor issues with schema wrapping, updated types

## 0.8.0

### Minor Changes

- 2d14fcc3: bump graphql-tools to v7

## 0.7.0

### Minor Changes

- c1b073de: feat(runtime): support TypedDocumentNode

## 0.6.0

### Minor Changes

- 9a7a55c4: feat(openapi): add sourceFormat option to provide schema format explicitly

## 0.5.4

### Patch Changes

- a3b42cfd: fix(runtime): handle transforms correctly for single source

## 0.5.3

### Patch Changes

- 79adf4b6: fix(utils): loadModuleExpression keep value if not string

## 0.5.2

### Patch Changes

- 9900d2fa: fix(runtime): handle noWrap transforms correctly
- 9900d2fa: chore(utils): move groupTransforms under utils

## 0.5.1

### Patch Changes

- 8f53be10: fix(utils): do not try to parse empty strings

## 0.5.0

### Minor Changes

- a789c312: feat(stitching): use batch execution

## 0.4.0

### Minor Changes

- 718e7a16: fix(runtime): fix browser support

## 0.3.0

### Minor Changes

- 705c4626: introduce an independent config package
