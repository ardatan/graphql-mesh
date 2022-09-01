# @graphql-mesh/json-schema

## 0.35.1

### Patch Changes

- Updated dependencies [[`7e9482723`](https://github.com/Urigo/graphql-mesh/commit/7e94827235f4abb81d7434d26c55d4fd9a07bdd5), [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9), [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9)]:
  - json-machete@0.14.1
  - @graphql-mesh/types@0.82.0
  - @omnigraph/json-schema@0.32.1
  - @graphql-mesh/store@0.8.34
  - @graphql-mesh/utils@0.41.1

## 0.35.0

### Minor Changes

- [#4378](https://github.com/Urigo/graphql-mesh/pull/4378) [`5742f4598`](https://github.com/Urigo/graphql-mesh/commit/5742f4598fe32bbbdb78b65ea8d6e1e4723308aa) Thanks [@ardatan](https://github.com/ardatan)! - If an object type has a discriminator, it becomes an interface type and any other allOf references with that implements that interface

- [#4369](https://github.com/Urigo/graphql-mesh/pull/4369) [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b) Thanks [@gilgardosh](https://github.com/gilgardosh)! - Support non-string link parameters

- [#4369](https://github.com/Urigo/graphql-mesh/pull/4369) [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b) Thanks [@gilgardosh](https://github.com/gilgardosh)! - If you pass a function to operationHeaders, it takes the operation config as second parameter including path, method and other details about the request

- [#4376](https://github.com/Urigo/graphql-mesh/pull/4376) [`3473a2686`](https://github.com/Urigo/graphql-mesh/commit/3473a2686284f824b46af823ff4be42ae5c008f8) Thanks [@ardatan](https://github.com/ardatan)! - Support links on non-object fields

- [#4369](https://github.com/Urigo/graphql-mesh/pull/4369) [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b) Thanks [@gilgardosh](https://github.com/gilgardosh)! - Introduce "destructObject" in query stringify options to spread the parameter content into the query parameters in order to support OAS explode: true behavior with query parameters that are objects

- [#4404](https://github.com/Urigo/graphql-mesh/pull/4404) [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f) Thanks [@ardatan](https://github.com/ardatan)! - New `onFetch` hook!

- [#4375](https://github.com/Urigo/graphql-mesh/pull/4375) [`0b3517539`](https://github.com/Urigo/graphql-mesh/commit/0b3517539024b1ae63a046c8ba6bedfb111a7395) Thanks [@ardatan](https://github.com/ardatan)! - `multipart/form-data` and **File Uploads** support (`type: string`, `format: binary`)

  If there is `type: string` and `format: binary` definitions in a schema type definition, it is considered as `File` scalar type and resolved as **WHATWG** [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) object.
  When the request content-type is `multipart/form-data`, the handler creates a **WHATWG** [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/File) object and puts the input arguments in it.

- [#4379](https://github.com/Urigo/graphql-mesh/pull/4379) [`7f0d02686`](https://github.com/Urigo/graphql-mesh/commit/7f0d026868b55e011d26fe41ecbb5173e9d195ed) Thanks [@ardatan](https://github.com/ardatan)! - Support readOnly and writeOnly. Now the fields flagged as writeOnly are not included in object types while writeOnly ones are not included in the input types, too.

### Patch Changes

- [#4380](https://github.com/Urigo/graphql-mesh/pull/4380) [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd) Thanks [@gilgardosh](https://github.com/gilgardosh)! - dependencies updates:

  - Updated dependency [`@graphql-tools/utils@8.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.1) (from `8.10.0`, in `dependencies`)

- [#4389](https://github.com/Urigo/graphql-mesh/pull/4389) [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/utils@8.10.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.1) (from `8.10.0`, in `dependencies`)

- Updated dependencies [[`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`5742f4598`](https://github.com/Urigo/graphql-mesh/commit/5742f4598fe32bbbdb78b65ea8d6e1e4723308aa), [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b), [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b), [`3473a2686`](https://github.com/Urigo/graphql-mesh/commit/3473a2686284f824b46af823ff4be42ae5c008f8), [`df37c40f4`](https://github.com/Urigo/graphql-mesh/commit/df37c40f47c6c53949f5d5f71e062c09fe5e1bd0), [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88), [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88), [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b), [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f), [`0b3517539`](https://github.com/Urigo/graphql-mesh/commit/0b3517539024b1ae63a046c8ba6bedfb111a7395), [`7a4023a2c`](https://github.com/Urigo/graphql-mesh/commit/7a4023a2cac2dacc8e78e10dabee65427b9a5e54), [`7f0d02686`](https://github.com/Urigo/graphql-mesh/commit/7f0d026868b55e011d26fe41ecbb5173e9d195ed), [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f)]:
  - @graphql-mesh/cross-helpers@0.2.3
  - @graphql-mesh/store@0.8.33
  - @graphql-mesh/types@0.81.0
  - @graphql-mesh/utils@0.41.0
  - @omnigraph/json-schema@0.32.0
  - json-machete@0.14.0

## 0.34.1

### Patch Changes

- Updated dependencies [[`32b3a63c2`](https://github.com/Urigo/graphql-mesh/commit/32b3a63c29a823dde830f7571a2e5b0213e03b12)]:
  - @omnigraph/json-schema@0.31.0

## 0.34.0

### Minor Changes

- [#4356](https://github.com/Urigo/graphql-mesh/pull/4356) [`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824) Thanks [@ardatan](https://github.com/ardatan)! - ## Improvements on outgoing HTTP calls

  - Now Mesh's default fetch implementation deduplicates the same GET JSON requests in the same execution context
  - You should pass `Accept: application/json` to make this work.
  - JSON Schema, new OpenAPI and RAML handlers now take GraphQL context as 3rd parameter. If you use `customFetch`, you can use that value to access Mesh internals such as the incoming `Request` object.

  ## HTTP Details in extensions for tracking HTTP calls

  You can add `includeHttpDetailsInExtensions: true` to your configuration file to get more information about HTTP calls done by Mesh during the execution in `extensions` field of the response.

  ![image](https://user-images.githubusercontent.com/20847995/186371035-6a327a2e-c74d-4bf4-a78f-6814b1001501.png)

### Patch Changes

- Updated dependencies [[`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824), [`be79b20a5`](https://github.com/Urigo/graphql-mesh/commit/be79b20a59b14d5d79bfeb260e4ecabc58c26efb), [`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824)]:
  - @graphql-mesh/utils@0.40.0
  - json-machete@0.13.2
  - @graphql-mesh/types@0.80.2
  - @omnigraph/json-schema@0.30.0
  - @graphql-mesh/store@0.8.32

## 0.33.2

### Patch Changes

- Updated dependencies [[`cd13405f5`](https://github.com/Urigo/graphql-mesh/commit/cd13405f5b358af364158c7b5fd36fa08b1d4a60)]:
  - @omnigraph/json-schema@0.29.2

## 0.33.1

### Patch Changes

- Updated dependencies [[`f23e14eba`](https://github.com/Urigo/graphql-mesh/commit/f23e14ebaf7c6a869207edc43b0e2a8114d0d21f)]:
  - @graphql-mesh/utils@0.39.0
  - json-machete@0.13.1
  - @omnigraph/json-schema@0.29.1
  - @graphql-mesh/store@0.8.31
  - @graphql-mesh/types@0.80.1

## 0.33.0

### Minor Changes

- [#4342](https://github.com/Urigo/graphql-mesh/pull/4342) [`ca6d6206b`](https://github.com/Urigo/graphql-mesh/commit/ca6d6206b02dfaa42eafa83442a04b33bbdf2db9) Thanks [@gilgardosh](https://github.com/gilgardosh)! - ## Some improvements on OAS handling
  - If there are no parameters defined in OAS links, the handler exposes the arguments of the original operation.
  - If the name of the link definition is not valid for GraphQL, the handler sanitizes it.

* [#4327](https://github.com/Urigo/graphql-mesh/pull/4327) [`f882aca38`](https://github.com/Urigo/graphql-mesh/commit/f882aca388380ad9dff1d618424e8a36b8607319) Thanks [@gilgardosh](https://github.com/gilgardosh)! - ## BREAKING CHANGES
  - Named types are no longer deduplicated automatically, so this might introduce new types on your side. Also the types with unknown content are always reflected as "JSON"/"Any" scalar type
  - `noDeduplicate` option has been dropped, because it is no longer needed.

### Patch Changes

- [#4343](https://github.com/Urigo/graphql-mesh/pull/4343) [`ab89f98cf`](https://github.com/Urigo/graphql-mesh/commit/ab89f98cf7b9a0dceb3b03aed5528b001c3f2496) Thanks [@gilgardosh](https://github.com/gilgardosh)! - Add \_ prefix if the type is Subscription to avoid conflict with the root "Subscription" type

- Updated dependencies [[`de7081cdb`](https://github.com/Urigo/graphql-mesh/commit/de7081cdbb4c6ddb8ff60ac15089a19f70ee3a3a), [`ab89f98cf`](https://github.com/Urigo/graphql-mesh/commit/ab89f98cf7b9a0dceb3b03aed5528b001c3f2496), [`de7081cdb`](https://github.com/Urigo/graphql-mesh/commit/de7081cdbb4c6ddb8ff60ac15089a19f70ee3a3a), [`ca6d6206b`](https://github.com/Urigo/graphql-mesh/commit/ca6d6206b02dfaa42eafa83442a04b33bbdf2db9), [`f882aca38`](https://github.com/Urigo/graphql-mesh/commit/f882aca388380ad9dff1d618424e8a36b8607319)]:
  - @omnigraph/json-schema@0.29.0
  - json-machete@0.13.0
  - @graphql-mesh/types@0.80.0
  - @graphql-mesh/store@0.8.30
  - @graphql-mesh/utils@0.38.1

## 0.32.1

### Patch Changes

- Updated dependencies [[`738335788`](https://github.com/Urigo/graphql-mesh/commit/7383357880685447189085204c984e632d36aa61)]:
  - @omnigraph/json-schema@0.28.0

## 0.32.0

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
  - @graphql-mesh/utils@0.38.0
  - @omnigraph/json-schema@0.27.0
  - json-machete@0.12.0
  - @graphql-mesh/string-interpolation@0.3.2
  - @graphql-mesh/store@0.8.29

## 0.31.2

### Patch Changes

- [#4275](https://github.com/Urigo/graphql-mesh/pull/4275) [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/utils@8.10.0` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.10.0) (was `8.9.1`, in `dependencies`)

- Updated dependencies [[`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2)]:
  - @graphql-mesh/cross-helpers@0.2.2
  - @graphql-mesh/store@0.8.28
  - @graphql-mesh/string-interpolation@0.3.1
  - @graphql-mesh/types@0.78.8
  - @graphql-mesh/utils@0.37.9
  - @omnigraph/json-schema@0.26.2
  - json-machete@0.11.2

## 0.31.1

### Patch Changes

- [#4263](https://github.com/Urigo/graphql-mesh/pull/4263) [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`@graphql-tools/utils@8.9.1` ↗︎](https://www.npmjs.com/package/@graphql-tools/utils/v/8.9.1) (was `8.9.0`, in `dependencies`)

- Updated dependencies [[`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)]:
  - @graphql-mesh/cross-helpers@0.2.1
  - @graphql-mesh/store@0.8.27
  - @graphql-mesh/types@0.78.7
  - @graphql-mesh/utils@0.37.8
  - @omnigraph/json-schema@0.26.1
  - json-machete@0.11.1

## 0.31.0

### Minor Changes

- [#4247](https://github.com/Urigo/graphql-mesh/pull/4247) [`31fc25974`](https://github.com/Urigo/graphql-mesh/commit/31fc259744b77a6a649487562f59e97f2e08e3aa) Thanks [@ardatan](https://github.com/ardatan)! - Accept a code file for `operationHeaders`

  Now you can generate headers dynamically from the resolver data dynamically like below;

  ```yml
  operationHeaders: ./myOperationHeaders.ts
  ```

  And in `myOperationHeaders.ts`

  ```ts
  export default function myOperationHeaders({ context }: ResolverData) {
    const someToken = context.request.headers.get('some-token')
    const anotherToken = await someLogicThatReturnsAnotherToken(someToken)
    return {
      'x-bar-token': anotherToken
    }
  }
  ```

### Patch Changes

- Updated dependencies [[`be784e653`](https://github.com/Urigo/graphql-mesh/commit/be784e6533f0c66774d1251382082f0a426e0978), [`be784e653`](https://github.com/Urigo/graphql-mesh/commit/be784e6533f0c66774d1251382082f0a426e0978), [`31fc25974`](https://github.com/Urigo/graphql-mesh/commit/31fc259744b77a6a649487562f59e97f2e08e3aa)]:
  - @omnigraph/json-schema@0.26.0

## 0.30.7

### Patch Changes

- Updated dependencies [[`755d3d487`](https://github.com/Urigo/graphql-mesh/commit/755d3d487c3069664a96e71732fa25aa2d161b1b), [`669abf58f`](https://github.com/Urigo/graphql-mesh/commit/669abf58f86faf5f9d678cf9ad103143488960d6)]:
  - @omnigraph/json-schema@0.25.0
  - json-machete@0.11.0

## 0.30.6

### Patch Changes

- Updated dependencies [[`78552ab23`](https://github.com/Urigo/graphql-mesh/commit/78552ab2387450dfa406fa6d5f49ae6f46b0c410), [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834), [`02c018249`](https://github.com/Urigo/graphql-mesh/commit/02c0182498e60c78bee5c44c42dc897a739e8f18), [`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b), [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834), [`961e07113`](https://github.com/Urigo/graphql-mesh/commit/961e07113161a54823644a1fecb39e2b5066544e)]:
  - @omnigraph/json-schema@0.24.6
  - json-machete@0.10.6
  - @graphql-mesh/utils@0.37.7
  - @graphql-mesh/types@0.78.6
  - @graphql-mesh/store@0.8.26

## 0.30.5

### Patch Changes

- c88a34d82: Now you can configure JSON Schema handler how to stringify query parameters;

  ```yml
  queryStringOptions:
    indices: false
    arrayFormat: brackets
  ```

  Check out the configuration schema to see the options;
  https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/json-schema/yaml-config.graphql#L25

- Updated dependencies [c88a34d82]
  - @omnigraph/json-schema@0.24.5
  - @graphql-mesh/types@0.78.5
  - @graphql-mesh/store@0.8.25
  - @graphql-mesh/utils@0.37.6
  - json-machete@0.10.5

## 0.30.4

### Patch Changes

- Updated dependencies [30d046724]
  - @graphql-mesh/utils@0.37.5
  - json-machete@0.10.4
  - @omnigraph/json-schema@0.24.4
  - @graphql-mesh/store@0.8.24
  - @graphql-mesh/types@0.78.4

## 0.30.3

### Patch Changes

- Updated dependencies [738e2f378]
  - @omnigraph/json-schema@0.24.3
  - @graphql-mesh/types@0.78.3
  - @graphql-mesh/store@0.8.23
  - @graphql-mesh/utils@0.37.4
  - json-machete@0.10.3

## 0.30.2

### Patch Changes

- Updated dependencies [bad0f40ab]
- Updated dependencies [a2ef35c35]
  - @omnigraph/json-schema@0.24.2
  - json-machete@0.10.2
  - @graphql-mesh/types@0.78.2
  - @graphql-mesh/utils@0.37.3
  - @graphql-mesh/store@0.8.22

## 0.30.1

### Patch Changes

- Updated dependencies [2e89d814b]
  - @graphql-mesh/store@0.8.21
  - @graphql-mesh/types@0.78.1
  - @omnigraph/json-schema@0.24.1
  - @graphql-mesh/utils@0.37.2
  - json-machete@0.10.1

## 0.30.0

### Minor Changes

- eade5bb9f: **New `noDeduplication` flag**

  By default, JSON Schema handler tries to deduplicate similar JSON Schema types;

  Let's say we have the following JSON Schema;

  ```json
  {
    "definitions": {
      "Book": {
        "type": "object",
        "title": "Book",
        "properties": {
          "title": {
            "type": "string"
          },
          "author": {
            "type": "string"
          },
          "price": {
            "type": "number"
          },
          "similarBooks": {
            "type": "array",
            "items": {
              "$ref": "#/definitions/SimilarBook"
            }
          }
        }
      },
      "SimilarBook": {
        "type": "object",
        "title": "Book",
        "properties": {
          "title": {
            "type": "string"
          },
          "author": {
            "type": "string"
          },
          "price": {
            "type": "number"
          },
          "similarBooks": {
            "type": "array",
            "items": {
              "$ref": "#/definitions/SimilarBook"
            }
          }
        }
      }
    }
  }
  ```

  And the result will be the following by default;

  ```graphql
  type Book {
    title: String
    author: String
    price: Float
    similarBooks: [Book]
  }
  ```

  But if you set this flag true, it will not deduplicate similar JSON Schema types;

  ```graphql
  type Book {
    title: String
    author: String
    price: Float
    similarBooks: [SimilarBook]
  }

  type SimilarBook {
    title: String
    author: String
    price: Float
    similarBooks: [SimilarBook]
  }
  ```

### Patch Changes

- Updated dependencies [eade5bb9f]
- Updated dependencies [6e6fd4ab7]
- Updated dependencies [bcd9355ee]
  - json-machete@0.10.0
  - @omnigraph/json-schema@0.24.0
  - @graphql-mesh/utils@0.37.1
  - @graphql-mesh/types@0.78.0
  - @graphql-mesh/store@0.8.20

## 0.29.2

### Patch Changes

- Updated dependencies [66f5d0189]
- Updated dependencies [0401c7617]
  - @graphql-mesh/types@0.77.1
  - @graphql-mesh/cross-helpers@0.2.0
  - @omnigraph/json-schema@0.23.0
  - @graphql-mesh/utils@0.37.0
  - @graphql-mesh/store@0.8.19
  - json-machete@0.9.2

## 0.29.1

### Patch Changes

- Updated dependencies [b69746d2c]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
- Updated dependencies [12e1e5d72]
  - @omnigraph/json-schema@0.22.0
  - @graphql-mesh/cross-helpers@0.1.7
  - @graphql-mesh/types@0.77.0
  - json-machete@0.9.1
  - @graphql-mesh/store@0.8.18
  - @graphql-mesh/utils@0.36.1

## 0.29.0

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

- Updated dependencies [19d06f6c9]
- Updated dependencies [19d06f6c9]
- Updated dependencies [a0950ac6f]
  - @graphql-mesh/utils@0.36.0
  - json-machete@0.9.0
  - @omnigraph/json-schema@0.21.0
  - @graphql-mesh/types@0.76.0
  - @graphql-mesh/store@0.8.17

## 0.28.19

### Patch Changes

- Updated dependencies [d4754ad08]
- Updated dependencies [2df026e90]
  - @graphql-mesh/types@0.75.0
  - @omnigraph/json-schema@0.20.7
  - @graphql-mesh/store@0.8.16
  - @graphql-mesh/utils@0.35.7
  - json-machete@0.8.15

## 0.28.18

### Patch Changes

- Updated dependencies [ed9ba7f48]
  - @graphql-mesh/types@0.74.2
  - @graphql-mesh/utils@0.35.6
  - @omnigraph/json-schema@0.20.6
  - @graphql-mesh/store@0.8.15
  - json-machete@0.8.14

## 0.28.17

### Patch Changes

- Updated dependencies [41cfb46b4]
  - @graphql-mesh/utils@0.35.5
  - json-machete@0.8.13
  - @omnigraph/json-schema@0.20.5
  - @graphql-mesh/store@0.8.14
  - @graphql-mesh/types@0.74.1

## 0.28.16

### Patch Changes

- Updated dependencies [13b9b30f7]
  - @graphql-mesh/string-interpolation@0.3.0
  - @graphql-mesh/types@0.74.0
  - @omnigraph/json-schema@0.20.4
  - @graphql-mesh/utils@0.35.4
  - @graphql-mesh/store@0.8.13
  - json-machete@0.8.12

## 0.28.15

### Patch Changes

- Updated dependencies [9733f490c]
  - @graphql-mesh/utils@0.35.3
  - json-machete@0.8.11
  - @omnigraph/json-schema@0.20.3
  - @graphql-mesh/store@0.8.12
  - @graphql-mesh/types@0.73.3

## 0.28.14

### Patch Changes

- 3c0366d2c: - Support import.meta.env instead of process.env for browsers
  - Ponyfill `util.inspect` only if it is not Node env
- Updated dependencies [3c0366d2c]
- Updated dependencies [3c0366d2c]
  - @graphql-mesh/cross-helpers@0.1.6
  - json-machete@0.8.10
  - @omnigraph/json-schema@0.20.2
  - @graphql-mesh/utils@0.35.2
  - @graphql-mesh/store@0.8.11
  - @graphql-mesh/types@0.73.2

## 0.28.13

### Patch Changes

- Updated dependencies [abe9fcc41]
  - @graphql-mesh/utils@0.35.1
  - json-machete@0.8.9
  - @omnigraph/json-schema@0.20.1
  - @graphql-mesh/store@0.8.10
  - @graphql-mesh/types@0.73.1

## 0.28.12

### Patch Changes

- 974e703e2: Cleanup dependencies
- Updated dependencies [974e703e2]
- Updated dependencies [19a99c055]
- Updated dependencies [974e703e2]
- Updated dependencies [974e703e2]
- Updated dependencies [893d526ab]
- Updated dependencies [974e703e2]
  - json-machete@0.8.8
  - @omnigraph/json-schema@0.20.0
  - @graphql-mesh/store@0.8.9
  - @graphql-mesh/string-interpolation@0.2.0
  - @graphql-mesh/types@0.73.0
  - @graphql-mesh/utils@0.35.0

## 0.28.11

### Patch Changes

- Updated dependencies [43eb3d2c2]
  - @graphql-mesh/utils@0.34.10
  - json-machete@0.8.7
  - @omnigraph/json-schema@0.19.8
  - @graphql-mesh/store@0.8.8
  - @graphql-mesh/types@0.72.5

## 0.28.10

### Patch Changes

- Updated dependencies [55ad5ea44]
  - @graphql-mesh/utils@0.34.9
  - json-machete@0.8.6
  - @graphql-mesh/store@0.8.7
  - @omnigraph/json-schema@0.19.7
  - @graphql-mesh/types@0.72.4

## 0.28.9

### Patch Changes

- Updated dependencies [31efa964e]
  - @graphql-mesh/utils@0.34.8
  - json-machete@0.8.5
  - @omnigraph/json-schema@0.19.6
  - @graphql-mesh/store@0.8.6
  - @graphql-mesh/types@0.72.3

## 0.28.8

### Patch Changes

- Updated dependencies [66b9b3ddc]
  - @graphql-mesh/store@0.8.5
  - json-machete@0.8.4
  - @graphql-mesh/utils@0.34.7
  - @graphql-mesh/types@0.72.2
  - @omnigraph/json-schema@0.19.5

## 0.28.7

### Patch Changes

- Updated dependencies [b9beacca2]
  - json-machete@0.8.3
  - @omnigraph/json-schema@0.19.4
  - @graphql-mesh/utils@0.34.6
  - @graphql-mesh/store@0.8.4
  - @graphql-mesh/types@0.72.1

## 0.28.6

### Patch Changes

- Updated dependencies [fa2542468]
  - @graphql-mesh/types@0.72.0
  - @omnigraph/json-schema@0.19.3
  - @graphql-mesh/store@0.8.3
  - @graphql-mesh/utils@0.34.5
  - json-machete@0.8.2

## 0.28.5

### Patch Changes

- Updated dependencies [ddbbec8a8]
  - @graphql-mesh/utils@0.34.4
  - json-machete@0.8.1
  - @omnigraph/json-schema@0.19.2
  - @graphql-mesh/store@0.8.2
  - @graphql-mesh/types@0.71.4

## 0.28.4

### Patch Changes

- Updated dependencies [2e9addd80]
- Updated dependencies [2e9addd80]
  - json-machete@0.8.0
  - @omnigraph/json-schema@0.19.1
  - @graphql-mesh/utils@0.34.3
  - @graphql-mesh/store@0.8.1
  - @graphql-mesh/types@0.71.3

## 0.28.3

### Patch Changes

- Updated dependencies [2f395a4b2]
  - @omnigraph/json-schema@0.19.0

## 0.28.2

### Patch Changes

- Updated dependencies [8c8b304e5]
  - @graphql-mesh/store@0.8.0
  - @graphql-mesh/types@0.71.2
  - @omnigraph/json-schema@0.18.2
  - @graphql-mesh/utils@0.34.2
  - json-machete@0.7.15

## 0.28.1

### Patch Changes

- 7856f92d3: Bump all packages
- Updated dependencies [7856f92d3]
  - json-machete@0.7.14
  - @omnigraph/json-schema@0.18.1
  - @graphql-mesh/store@0.7.8
  - @graphql-mesh/types@0.71.1
  - @graphql-mesh/utils@0.34.1

## 0.28.0

### Minor Changes

- 331b62637: feat(json-schema): provide different response schemas for different http status codes

### Patch Changes

- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [f963b57ce]
- Updated dependencies [0644f31f2]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
- Updated dependencies [331b62637]
  - json-machete@0.7.13
  - @omnigraph/json-schema@0.18.0
  - @graphql-mesh/types@0.71.0
  - @graphql-mesh/utils@0.34.0
  - @graphql-mesh/store@0.7.7

## 0.27.8

### Patch Changes

- json-machete@0.7.12
- @graphql-mesh/store@0.7.6
- @graphql-mesh/utils@0.33.6
- @omnigraph/json-schema@0.17.26
- @graphql-mesh/types@0.70.6

## 0.27.7

### Patch Changes

- Updated dependencies [decbe5fbb]
  - @graphql-mesh/store@0.7.5
  - @graphql-mesh/types@0.70.5
  - @omnigraph/json-schema@0.17.25
  - @graphql-mesh/utils@0.33.5
  - json-machete@0.7.11

## 0.27.6

### Patch Changes

- 35a55e841: Bump GraphQL Tools packages
- Updated dependencies [35a55e841]
  - json-machete@0.7.10
  - @omnigraph/json-schema@0.17.24
  - @graphql-mesh/store@0.7.4
  - @graphql-mesh/types@0.70.4
  - @graphql-mesh/utils@0.33.4

## 0.27.5

### Patch Changes

- Updated dependencies [4fa959de3]
  - @graphql-mesh/store@0.7.3
  - @graphql-mesh/types@0.70.3
  - @omnigraph/json-schema@0.17.23
  - @graphql-mesh/utils@0.33.3
  - json-machete@0.7.9

## 0.27.4

### Patch Changes

- Updated dependencies [d64c74b75]
  - json-machete@0.7.8
  - @omnigraph/json-schema@0.17.22

## 0.27.3

### Patch Changes

- Updated dependencies [b02f5b008]
- Updated dependencies [114629e47]
  - @graphql-mesh/types@0.70.2
  - json-machete@0.7.7
  - @omnigraph/json-schema@0.17.21
  - @graphql-mesh/store@0.7.2
  - @graphql-mesh/utils@0.33.2

## 0.27.2

### Patch Changes

- Updated dependencies [26e69dbe9]
  - @omnigraph/json-schema@0.17.20

## 0.27.1

### Patch Changes

- 2d5c6c72a: add Git repository link in package.json
- Updated dependencies [2d5c6c72a]
  - json-machete@0.7.6
  - @omnigraph/json-schema@0.17.19
  - @graphql-mesh/store@0.7.1
  - @graphql-mesh/types@0.70.1
  - @graphql-mesh/utils@0.33.1

## 0.27.0

### Minor Changes

- d567be7b5: feat(json-schema): support bundles from different sources

### Patch Changes

- Updated dependencies [d567be7b5]
- Updated dependencies [d567be7b5]
  - @graphql-mesh/types@0.70.0
  - @graphql-mesh/utils@0.33.0
  - @graphql-mesh/store@0.7.0
  - @omnigraph/json-schema@0.17.18
  - json-machete@0.7.5

## 0.26.9

### Patch Changes

- Updated dependencies [f30dba61e]
  - @graphql-mesh/types@0.69.0
  - @omnigraph/json-schema@0.17.17
  - @graphql-mesh/store@0.6.2
  - @graphql-mesh/utils@0.32.2
  - json-machete@0.7.4

## 0.26.8

### Patch Changes

- Updated dependencies [c53203723]
  - json-machete@0.7.3
  - @omnigraph/json-schema@0.17.16

## 0.26.7

### Patch Changes

- Updated dependencies [c6f0314ac]
  - json-machete@0.7.2
  - @omnigraph/json-schema@0.17.15

## 0.26.6

### Patch Changes

- Updated dependencies [be61de529]
  - @graphql-mesh/types@0.68.3
  - @omnigraph/json-schema@0.17.14
  - @graphql-mesh/store@0.6.1
  - @graphql-mesh/utils@0.32.1
  - json-machete@0.7.1

## 0.26.5

### Patch Changes

- Updated dependencies [b1a6df928]
- Updated dependencies [67fb11706]
  - @graphql-mesh/types@0.68.2
  - json-machete@0.7.0
  - @graphql-mesh/store@0.6.0
  - @graphql-mesh/utils@0.32.0
  - @omnigraph/json-schema@0.17.13

## 0.26.4

### Patch Changes

- Updated dependencies [b2c537c2a]
  - @graphql-mesh/store@0.5.0
  - @graphql-mesh/utils@0.31.0
  - @graphql-mesh/types@0.68.1
  - json-machete@0.6.1
  - @omnigraph/json-schema@0.17.12

## 0.26.3

### Patch Changes

- Updated dependencies [b45dac0c0]
- Updated dependencies [b45dac0c0]
  - json-machete@0.6.0
  - @omnigraph/json-schema@0.17.11

## 0.26.2

### Patch Changes

- Updated dependencies [6c318b91a]
  - @graphql-mesh/types@0.68.0
  - @omnigraph/json-schema@0.17.10
  - @graphql-mesh/store@0.4.2
  - @graphql-mesh/utils@0.30.2
  - json-machete@0.5.20

## 0.26.1

### Patch Changes

- Updated dependencies [4c7b90a87]
  - @graphql-mesh/store@0.4.1
  - @graphql-mesh/types@0.67.1
  - @omnigraph/json-schema@0.17.9
  - @graphql-mesh/utils@0.30.1
  - json-machete@0.5.19

## 0.26.0

### Minor Changes

- 01bac6bb5: enhance: reduce memory consumption

### Patch Changes

- 01bac6bb5: fix - align graphql-tools versions
- Updated dependencies [01bac6bb5]
- Updated dependencies [01bac6bb5]
  - @omnigraph/json-schema@0.17.8
  - @graphql-mesh/store@0.4.0
  - @graphql-mesh/types@0.67.0
  - @graphql-mesh/utils@0.30.0
  - json-machete@0.5.18

## 0.25.7

### Patch Changes

- Updated dependencies [268db0462]
  - @graphql-mesh/utils@0.29.0
  - json-machete@0.5.17
  - @omnigraph/json-schema@0.17.7
  - @graphql-mesh/store@0.3.29
  - @graphql-mesh/types@0.66.6

## 0.25.6

### Patch Changes

- 2ffb1f287: fix: json schema reference
- Updated dependencies [2ffb1f287]
  - @graphql-mesh/types@0.66.5
  - @omnigraph/json-schema@0.17.6
  - @graphql-mesh/store@0.3.28
  - @graphql-mesh/utils@0.28.5
  - json-machete@0.5.16

## 0.25.5

### Patch Changes

- Updated dependencies [6d2d46480]
  - @graphql-mesh/types@0.66.4
  - @omnigraph/json-schema@0.17.5
  - @graphql-mesh/store@0.3.27
  - @graphql-mesh/utils@0.28.4
  - json-machete@0.5.15

## 0.25.4

### Patch Changes

- f11d8b9c8: fix: add implicit dependencies
- Updated dependencies [f11d8b9c8]
  - @omnigraph/json-schema@0.17.4
  - @graphql-mesh/store@0.3.26
  - @graphql-mesh/types@0.66.3
  - @graphql-mesh/utils@0.28.3
  - json-machete@0.5.14

## 0.25.3

### Patch Changes

- Updated dependencies [fb876e99c]
  - @graphql-mesh/types@0.66.2
  - @graphql-mesh/utils@0.28.2
  - @omnigraph/json-schema@0.17.3
  - json-machete@0.5.13
  - @graphql-mesh/store@0.3.25

## 0.25.2

### Patch Changes

- Updated dependencies [98ff961ff]
  - @graphql-mesh/types@0.66.1
  - @omnigraph/json-schema@0.17.2
  - @graphql-mesh/utils@0.28.1
  - json-machete@0.5.12
  - @graphql-mesh/store@0.3.24

## 0.25.1

### Patch Changes

- b481fbc39: enhance: add tslib to dependencies to reduce bundle size
- Updated dependencies [6f07de8fe]
- Updated dependencies [6f07de8fe]
- Updated dependencies [b481fbc39]
  - @graphql-mesh/types@0.66.0
  - @graphql-mesh/utils@0.28.0
  - @omnigraph/json-schema@0.17.1
  - json-machete@0.5.11
  - @graphql-mesh/store@0.3.23

## 0.25.0

### Minor Changes

- 21de17a3d: feat(json-schema): ability to provide additional request body with requestBaseBody in the config

### Patch Changes

- Updated dependencies [21de17a3d]
- Updated dependencies [3f4bb09a9]
  - @omnigraph/json-schema@0.17.0
  - @graphql-mesh/types@0.65.0
  - @graphql-mesh/utils@0.27.9
  - json-machete@0.5.10
  - @graphql-mesh/store@0.3.22

## 0.24.16

### Patch Changes

- Updated dependencies [8b8eb5158]
- Updated dependencies [8b8eb5158]
  - @graphql-mesh/types@0.64.2
  - @omnigraph/json-schema@0.16.2
  - @graphql-mesh/utils@0.27.8
  - json-machete@0.5.9
  - @graphql-mesh/store@0.3.21

## 0.24.15

### Patch Changes

- Updated dependencies [ca6bb5ff3]
- Updated dependencies [ca6bb5ff3]
  - json-machete@0.5.8
  - @graphql-mesh/utils@0.27.7
  - @omnigraph/json-schema@0.16.1
  - @graphql-mesh/store@0.3.20
  - @graphql-mesh/types@0.64.1

## 0.24.14

### Patch Changes

- Updated dependencies [275f82b53]
  - @omnigraph/json-schema@0.16.0

## 0.24.13

### Patch Changes

- Updated dependencies [c84d9e95e]
  - @omnigraph/json-schema@0.15.1

## 0.24.12

### Patch Changes

- Updated dependencies [12256ec58]
- Updated dependencies [08b250e04]
- Updated dependencies [e3f941db5]
  - @omnigraph/json-schema@0.15.0
  - @graphql-mesh/types@0.64.0
  - @graphql-mesh/utils@0.27.6
  - json-machete@0.5.7
  - @graphql-mesh/store@0.3.19

## 0.24.11

### Patch Changes

- 1815865c3: fix: bump fixed graphql-tools
- Updated dependencies [1815865c3]
  - @omnigraph/json-schema@0.14.3
  - @graphql-mesh/store@0.3.18
  - @graphql-mesh/types@0.63.1
  - @graphql-mesh/utils@0.27.5
  - json-machete@0.5.6

## 0.24.10

### Patch Changes

- Updated dependencies [b6eca9baa]
- Updated dependencies [b6eca9baa]
  - @graphql-mesh/types@0.63.0
  - @omnigraph/json-schema@0.14.2
  - @graphql-mesh/utils@0.27.4
  - json-machete@0.5.5
  - @graphql-mesh/store@0.3.17

## 0.24.9

### Patch Changes

- Updated dependencies [0d43ecf19]
  - @graphql-mesh/types@0.62.2
  - @omnigraph/json-schema@0.14.1
  - @graphql-mesh/utils@0.27.3
  - json-machete@0.5.4
  - @graphql-mesh/store@0.3.16

## 0.24.8

### Patch Changes

- Updated dependencies [c71b29004]
- Updated dependencies [15e1f68c5]
- Updated dependencies [447bc3697]
  - @graphql-mesh/utils@0.27.2
  - @omnigraph/json-schema@0.14.0
  - @graphql-mesh/types@0.62.1
  - json-machete@0.5.3
  - @graphql-mesh/store@0.3.15

## 0.24.7

### Patch Changes

- Updated dependencies [240ec7b38]
- Updated dependencies [fcbd12a35]
- Updated dependencies [3a21004c9]
  - @graphql-mesh/types@0.62.0
  - @graphql-mesh/utils@0.27.1
  - @omnigraph/json-schema@0.13.6
  - json-machete@0.5.2
  - @graphql-mesh/store@0.3.14

## 0.24.6

### Patch Changes

- Updated dependencies [05ec30255]
  - @omnigraph/json-schema@0.13.5

## 0.24.5

### Patch Changes

- Updated dependencies [1c8827604]
  - json-machete@0.5.1
  - @omnigraph/json-schema@0.13.4

## 0.24.4

### Patch Changes

- Updated dependencies [49e9ca808]
- Updated dependencies [49e9ca808]
  - json-machete@0.5.0
  - @omnigraph/json-schema@0.13.3

## 0.24.3

### Patch Changes

- Updated dependencies [900a01355]
  - @graphql-mesh/utils@0.27.0
  - json-machete@0.4.3
  - @omnigraph/json-schema@0.13.2
  - @graphql-mesh/store@0.3.13

## 0.24.2

### Patch Changes

- Updated dependencies [66ca1a366]
  - @graphql-mesh/types@0.61.0
  - @omnigraph/json-schema@0.13.1
  - @graphql-mesh/utils@0.26.4
  - json-machete@0.4.2
  - @graphql-mesh/store@0.3.12

## 0.24.1

### Patch Changes

- Updated dependencies [a79268b3a]
- Updated dependencies [a79268b3a]
- Updated dependencies [a79268b3a]
  - @graphql-mesh/types@0.60.0
  - @omnigraph/json-schema@0.13.0
  - @graphql-mesh/utils@0.26.3
  - json-machete@0.4.1
  - @graphql-mesh/store@0.3.11

## 0.24.0

### Minor Changes

- 020431bdc: feat(json-schema/openapi/raml): respect error status codes

### Patch Changes

- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
  - json-machete@0.4.0
  - @omnigraph/json-schema@0.12.0
  - @graphql-mesh/types@0.59.0
  - @graphql-mesh/utils@0.26.2
  - @graphql-mesh/store@0.3.10

## 0.23.5

### Patch Changes

- Updated dependencies [113091148]
- Updated dependencies [6bb4cf673]
- Updated dependencies [6bb4cf673]
  - @graphql-mesh/utils@0.26.1
  - @omnigraph/json-schema@0.11.2
  - @graphql-mesh/types@0.58.0
  - json-machete@0.3.7
  - @graphql-mesh/store@0.3.9

## 0.23.4

### Patch Changes

- Updated dependencies [92d687133]
- Updated dependencies [92d687133]
- Updated dependencies [92d687133]
  - @omnigraph/json-schema@0.11.1
  - json-machete@0.3.6

## 0.23.3

### Patch Changes

- Updated dependencies [b69233517]
  - @omnigraph/json-schema@0.11.0

## 0.23.2

### Patch Changes

- Updated dependencies [6d76179e4]
  - @omnigraph/json-schema@0.10.0

## 0.23.1

### Patch Changes

- Updated dependencies [e30494c95]
  - @omnigraph/json-schema@0.9.0

## 0.23.0

### Minor Changes

- 1ab0aebbc: feat(json-schema): better error handling

### Patch Changes

- Updated dependencies [8e52fd06a]
- Updated dependencies [1ab0aebbc]
- Updated dependencies [56e2257fa]
- Updated dependencies [56e2257fa]
  - json-machete@0.3.5
  - @omnigraph/json-schema@0.8.0
  - @graphql-mesh/types@0.57.2
  - @graphql-mesh/utils@0.26.0
  - @graphql-mesh/store@0.3.8

## 0.22.15

### Patch Changes

- Updated dependencies [2b876f2b8]
  - @graphql-mesh/utils@0.25.0
  - json-machete@0.3.4
  - @omnigraph/json-schema@0.7.4
  - @graphql-mesh/store@0.3.7

## 0.22.14

### Patch Changes

- Updated dependencies [d907351c5]
- Updated dependencies [80eb8e92b]
- Updated dependencies [d907351c5]
- Updated dependencies [d907351c5]
  - json-machete@0.3.3
  - @omnigraph/json-schema@0.7.3
  - @graphql-mesh/types@0.57.1
  - @graphql-mesh/utils@0.24.2
  - @graphql-mesh/store@0.3.6

## 0.22.13

### Patch Changes

- Updated dependencies [4fe346123]
  - @omnigraph/json-schema@0.7.2

## 0.22.12

### Patch Changes

- Updated dependencies [26d685f2a]
  - @graphql-mesh/utils@0.24.1
  - json-machete@0.3.2
  - @omnigraph/json-schema@0.7.1
  - @graphql-mesh/store@0.3.5

## 0.22.11

### Patch Changes

- Updated dependencies [baf004f78]
- Updated dependencies [cfca98d34]
  - @omnigraph/json-schema@0.7.0
  - @graphql-mesh/types@0.57.0
  - @graphql-mesh/utils@0.24.0
  - json-machete@0.3.1
  - @graphql-mesh/store@0.3.4

## 0.22.10

### Patch Changes

- Updated dependencies [5666484d6]
  - json-machete@0.3.0
  - @omnigraph/json-schema@0.6.0
  - @graphql-mesh/utils@0.23.0
  - @graphql-mesh/store@0.3.3

## 0.22.9

### Patch Changes

- Updated dependencies [6c216c309]
- Updated dependencies [6c216c309]
- Updated dependencies [8d233db89]
- Updated dependencies [6c216c309]
  - @omnigraph/json-schema@0.5.1
  - @graphql-mesh/utils@0.22.2
  - json-machete@0.2.1
  - @graphql-mesh/store@0.3.2

## 0.22.8

### Patch Changes

- Updated dependencies [c22eb1b5e]
- Updated dependencies [e8cc53f11]
  - @graphql-mesh/utils@0.22.1
  - json-machete@0.2.0
  - @omnigraph/json-schema@0.5.0
  - @graphql-mesh/store@0.3.1

## 0.22.7

### Patch Changes

- Updated dependencies [f40b0d42c]
- Updated dependencies [f40b0d42c]
- Updated dependencies [ec0d1d639]
- Updated dependencies [ec0d1d639]
- Updated dependencies [1cc0acb9a]
  - json-machete@0.1.0
  - @omnigraph/json-schema@0.4.0
  - @graphql-mesh/store@0.3.0
  - @graphql-mesh/types@0.56.0
  - @graphql-mesh/utils@0.22.0

## 0.22.6

### Patch Changes

- Updated dependencies [3bded2bad]
- Updated dependencies [3bded2bad]
  - @omnigraph/json-schema@0.3.5
  - json-machete@0.0.27

## 0.22.5

### Patch Changes

- 8de12b4d8: fix(json-machete): dereference imported json files correctly
- Updated dependencies [8de12b4d8]
  - json-machete@0.0.26
  - @omnigraph/json-schema@0.3.4

## 0.22.4

### Patch Changes

- 27c26392d: bump versions
- Updated dependencies [27c26392d]
- Updated dependencies [1b332487c]
  - json-machete@0.0.25
  - @omnigraph/json-schema@0.3.3
  - @graphql-mesh/types@0.55.0
  - @graphql-mesh/utils@0.21.1
  - @graphql-mesh/store@0.2.3

## 0.22.3

### Patch Changes

- Updated dependencies [875d0e48d]
  - @graphql-mesh/utils@0.21.0
  - json-machete@0.0.24
  - @omnigraph/json-schema@0.3.2
  - @graphql-mesh/store@0.2.2

## 0.22.2

### Patch Changes

- Updated dependencies [761b16ed9]
  - @graphql-mesh/types@0.54.1
  - @omnigraph/json-schema@0.3.1
  - @graphql-mesh/utils@0.20.1
  - json-machete@0.0.23
  - @graphql-mesh/store@0.2.1

## 0.22.1

### Patch Changes

- Updated dependencies [b7241ebb6]
  - @omnigraph/json-schema@0.3.0

## 0.22.0

### Minor Changes

- 09f81dd74: GraphQL v16 compatibility
- 09f81dd74: GraphQL v16 compability

### Patch Changes

- Updated dependencies [c4d8be6f4]
- Updated dependencies [09f81dd74]
- Updated dependencies [267573a16]
- Updated dependencies [09f81dd74]
  - @omnigraph/json-schema@0.2.0
  - @graphql-mesh/store@0.2.0
  - @graphql-mesh/types@0.54.0
  - @graphql-mesh/utils@0.20.0
  - json-machete@0.0.22

## 0.21.7

### Patch Changes

- Updated dependencies [592afa2b9]
  - @omnigraph/json-schema@0.1.7

## 0.21.6

### Patch Changes

- Updated dependencies [0a1756f9c]
  - @omnigraph/json-schema@0.1.6

## 0.21.5

### Patch Changes

- Updated dependencies [0dc08e5cc]
  - @graphql-mesh/utils@0.19.0
  - json-machete@0.0.21
  - @omnigraph/json-schema@0.1.5
  - @graphql-mesh/store@0.1.19

## 0.21.4

### Patch Changes

- Updated dependencies [ac95631ea]
  - json-machete@0.0.20
  - @omnigraph/json-schema@0.1.4

## 0.21.3

### Patch Changes

- Updated dependencies [932ce6063]
  - @omnigraph/json-schema@0.1.3

## 0.21.2

### Patch Changes

- Updated dependencies [47c4fb402]
  - @omnigraph/json-schema@0.1.2

## 0.21.1

### Patch Changes

- Updated dependencies [963e064f0]
  - @omnigraph/json-schema@0.1.1

## 0.21.0

### Minor Changes

- 6f57be0c1: feat(json-schema): expose GraphQL Tools loader compatible with loadSchema

### Patch Changes

- Updated dependencies [6f57be0c1]
  - @graphql-mesh/types@0.53.0
  - @omnigraph/json-schema@0.1.0
  - @graphql-mesh/utils@0.18.1
  - json-machete@0.0.19
  - @graphql-mesh/store@0.1.18

## 0.20.0

### Minor Changes

- 811960cdc: feat(runtime): use factory functions for debug messages

### Patch Changes

- Updated dependencies [4ec7a14ba]
- Updated dependencies [811960cdc]
- Updated dependencies [6f5ffe766]
  - @graphql-mesh/utils@0.18.0
  - @graphql-mesh/types@0.52.0
  - json-machete@0.0.18
  - @graphql-mesh/store@0.1.17

## 0.19.6

### Patch Changes

- Updated dependencies [256abf5f7]
  - @graphql-mesh/types@0.51.0
  - @graphql-mesh/utils@0.17.2
  - json-machete@0.0.17
  - @graphql-mesh/store@0.1.16

## 0.19.5

### Patch Changes

- Updated dependencies [8c9b709ae]
  - @graphql-mesh/types@0.50.0
  - @graphql-mesh/utils@0.17.1
  - json-machete@0.0.16
  - @graphql-mesh/store@0.1.15

## 0.19.4

### Patch Changes

- Updated dependencies [7bd145769]
  - @graphql-mesh/utils@0.17.0
  - json-machete@0.0.15
  - @graphql-mesh/store@0.1.14

## 0.19.3

### Patch Changes

- 5920a760f: fix(json-schema): no need to have nonnull for input types

## 0.19.2

### Patch Changes

- 297e3bb66: fix(json-schema): no need to have nonnull for input types

## 0.19.1

### Patch Changes

- 472c5887b: enhance(readFileOrUrl): remove unnecessary caching
- Updated dependencies [472c5887b]
  - @graphql-mesh/utils@0.16.3
  - json-machete@0.0.14
  - @graphql-mesh/store@0.1.13

## 0.19.0

### Minor Changes

- f1d580ddb: feat(json-schema): correct scalar types for json schema sources

## 0.18.6

### Patch Changes

- 459e8fb4d: fix(json-schema): add missing oneOf directive definition if needed

## 0.18.5

### Patch Changes

- Updated dependencies [6ce43ddac]
  - @graphql-mesh/types@0.49.0
  - @graphql-mesh/utils@0.16.2
  - json-machete@0.0.13
  - @graphql-mesh/store@0.1.12

## 0.18.4

### Patch Changes

- Updated dependencies [46a4f7b73]
- Updated dependencies [aa804d043]
- Updated dependencies [67552c8f8]
  - @graphql-mesh/utils@0.16.1
  - @graphql-mesh/types@0.48.0
  - json-machete@0.0.12
  - @graphql-mesh/store@0.1.11

## 0.18.3

### Patch Changes

- Updated dependencies [9eff8a396]
  - @graphql-mesh/types@0.47.0
  - @graphql-mesh/utils@0.16.0
  - json-machete@0.0.11
  - @graphql-mesh/store@0.1.10

## 0.18.2

### Patch Changes

- 0c49591e5: fix(json-schema): ignore if there is a hidden field while resolving oneOf input type

## 0.18.1

### Patch Changes

- Updated dependencies [f4f30741d]
  - @graphql-mesh/utils@0.15.0
  - json-machete@0.0.10
  - @graphql-mesh/store@0.1.9

## 0.18.0

### Minor Changes

- d189b4034: feat(json-schema): handle non-latin or non-string values correctly

### Patch Changes

- Updated dependencies [4545fe72d]
- Updated dependencies [d189b4034]
- Updated dependencies [f23820ed0]
- Updated dependencies [06d688e70]
  - @graphql-mesh/types@0.46.0
  - @graphql-mesh/utils@0.14.0
  - json-machete@0.0.9
  - @graphql-mesh/store@0.1.8

## 0.17.7

### Patch Changes

- fc51c574d: Dependency updates
- Updated dependencies [fc51c574d]
  - @graphql-mesh/store@0.1.7
  - @graphql-mesh/types@0.45.2
  - @graphql-mesh/utils@0.13.7
  - json-machete@0.0.8

## 0.17.6

### Patch Changes

- Updated dependencies [1c2667489]
  - @graphql-mesh/types@0.45.1
  - @graphql-mesh/utils@0.13.6
  - json-machete@0.0.7
  - @graphql-mesh/store@0.1.6

## 0.17.5

### Patch Changes

- Updated dependencies [7080a2f1d]
  - @graphql-mesh/utils@0.13.5
  - json-machete@0.0.6
  - @graphql-mesh/store@0.1.5

## 0.17.4

### Patch Changes

- Updated dependencies [6266d1774]
- Updated dependencies [94606e7b9]
- Updated dependencies [2b8dae1cb]
- Updated dependencies [0c97b4b75]
  - @graphql-mesh/types@0.45.0
  - @graphql-mesh/utils@0.13.4
  - json-machete@0.0.5
  - @graphql-mesh/store@0.1.4

## 0.17.3

### Patch Changes

- Updated dependencies [25d10cc23]
  - @graphql-mesh/types@0.44.2
  - @graphql-mesh/utils@0.13.3
  - json-machete@0.0.4
  - @graphql-mesh/store@0.1.3

## 0.17.2

### Patch Changes

- Updated dependencies [49c8ceb38]
  - @graphql-mesh/types@0.44.1
  - @graphql-mesh/utils@0.13.2
  - json-machete@0.0.3
  - @graphql-mesh/store@0.1.2

## 0.17.1

### Patch Changes

- Updated dependencies [1ee417e3d]
  - @graphql-mesh/types@0.44.0
  - @graphql-mesh/utils@0.13.1
  - json-machete@0.0.2
  - @graphql-mesh/store@0.1.1

## 0.17.0

### Minor Changes

- 885ea439a: New MeshStore approach
- 885ea439a: feat(json-schema): Huge refactor

### Patch Changes

- a9ad7356f: fix(json-schema): support all HTTP methods in a correct way
- Updated dependencies [885ea439a]
- Updated dependencies [d8051f87d]
- Updated dependencies [d55f30c89]
- Updated dependencies [d8051f87d]
  - @graphql-mesh/store@0.1.0
  - @graphql-mesh/types@0.43.0
  - @graphql-mesh/utils@0.13.0
  - json-machete@0.0.1
