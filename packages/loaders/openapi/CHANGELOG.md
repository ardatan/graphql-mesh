# @omnigraph/openapi

## 0.14.6

### Patch Changes

- Updated dependencies [[`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53), [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53), [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53), [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53), [`9dac0d835`](https://github.com/Urigo/graphql-mesh/commit/9dac0d8355148d86d75bceb4c4983960e8063c53)]:
  - @graphql-mesh/cross-helpers@0.2.4
  - @graphql-mesh/types@0.82.3
  - @graphql-mesh/utils@0.41.4
  - @omnigraph/json-schema@0.33.2
  - json-machete@0.14.5

## 0.14.5

### Patch Changes

- Updated dependencies [[`b9bb80094`](https://github.com/Urigo/graphql-mesh/commit/b9bb8009407d27440267a5e9a7ec5dbfecc9bf8f), [`b9bb80094`](https://github.com/Urigo/graphql-mesh/commit/b9bb8009407d27440267a5e9a7ec5dbfecc9bf8f)]:
  - @omnigraph/json-schema@0.33.1
  - @graphql-mesh/types@0.82.2
  - json-machete@0.14.4
  - @graphql-mesh/utils@0.41.3

## 0.14.4

### Patch Changes

- [#4426](https://github.com/Urigo/graphql-mesh/pull/4426) [`3571324cd`](https://github.com/Urigo/graphql-mesh/commit/3571324cdca5d731d67ee1cc8829225986360409) Thanks [@ardatan](https://github.com/ardatan)! - Respect original type for GraphQL Codegen TS definitions while generating a scalar type based on a RegExp pattern

- Updated dependencies [[`3571324cd`](https://github.com/Urigo/graphql-mesh/commit/3571324cdca5d731d67ee1cc8829225986360409), [`3571324cd`](https://github.com/Urigo/graphql-mesh/commit/3571324cdca5d731d67ee1cc8829225986360409)]:
  - @omnigraph/json-schema@0.33.0
  - json-machete@0.14.3

## 0.14.3

### Patch Changes

- [#4418](https://github.com/Urigo/graphql-mesh/pull/4418) [`59dbb1985`](https://github.com/Urigo/graphql-mesh/commit/59dbb1985b07a250f0113d70e0f55e467dc17812) Thanks [@renovate](https://github.com/apps/renovate)! - dependencies updates:

  - Updated dependency [`openapi-types@12.0.2` ↗︎](https://www.npmjs.com/package/openapi-types/v/12.0.2) (from `12.0.0`, in `dependencies`)

- [`e1891993c`](https://github.com/Urigo/graphql-mesh/commit/e1891993c1b638987b62ea93f5571f656f668ccc) Thanks [@ardatan](https://github.com/ardatan)! - Respect descriptions for binary/file fields and number fields with minimum and maximum

- Updated dependencies [[`3165827f7`](https://github.com/Urigo/graphql-mesh/commit/3165827f74b48a914b9604b024cd1318c211aa14), [`e1891993c`](https://github.com/Urigo/graphql-mesh/commit/e1891993c1b638987b62ea93f5571f656f668ccc)]:
  - @graphql-mesh/types@0.82.1
  - json-machete@0.14.2
  - @omnigraph/json-schema@0.32.2
  - @graphql-mesh/utils@0.41.2

## 0.14.2

### Patch Changes

- [#4419](https://github.com/Urigo/graphql-mesh/pull/4419) [`2772150e7`](https://github.com/Urigo/graphql-mesh/commit/2772150e7230ed796aa8e7a33337c96eb2fb0a76) Thanks [@ardatan](https://github.com/ardatan)! - fix(openapi): allow user to override accept from the schema

## 0.14.1

### Patch Changes

- [#4412](https://github.com/Urigo/graphql-mesh/pull/4412) [`7e9482723`](https://github.com/Urigo/graphql-mesh/commit/7e94827235f4abb81d7434d26c55d4fd9a07bdd5) Thanks [@ardatan](https://github.com/ardatan)! - Accept an array for "type" property in JSON Schema because it was broken and causing a bug that creates an invalid `undefined` scalar type.

  ```json
  {
    "type": ["string", "number", "boolean", "integer", "array"]
  }
  ```

- Updated dependencies [[`7e9482723`](https://github.com/Urigo/graphql-mesh/commit/7e94827235f4abb81d7434d26c55d4fd9a07bdd5), [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9), [`ca7994fad`](https://github.com/Urigo/graphql-mesh/commit/ca7994fad35d8d88e66117cb166e329ccda09bf9)]:
  - json-machete@0.14.1
  - @graphql-mesh/types@0.82.0
  - @omnigraph/json-schema@0.32.1
  - @graphql-mesh/utils@0.41.1

## 0.14.0

### Minor Changes

- [#4378](https://github.com/Urigo/graphql-mesh/pull/4378) [`5742f4598`](https://github.com/Urigo/graphql-mesh/commit/5742f4598fe32bbbdb78b65ea8d6e1e4723308aa) Thanks [@ardatan](https://github.com/ardatan)! - If an object type has a discriminator, it becomes an interface type and any other allOf references with that implements that interface

- [#4369](https://github.com/Urigo/graphql-mesh/pull/4369) [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b) Thanks [@gilgardosh](https://github.com/gilgardosh)! - Support non-string link parameters

- [#4369](https://github.com/Urigo/graphql-mesh/pull/4369) [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b) Thanks [@gilgardosh](https://github.com/gilgardosh)! - If you pass a function to operationHeaders, it takes the operation config as second parameter including path, method and other details about the request

- [#4376](https://github.com/Urigo/graphql-mesh/pull/4376) [`3473a2686`](https://github.com/Urigo/graphql-mesh/commit/3473a2686284f824b46af823ff4be42ae5c008f8) Thanks [@ardatan](https://github.com/ardatan)! - Support links on non-object fields

- [#4396](https://github.com/Urigo/graphql-mesh/pull/4396) [`df37c40f4`](https://github.com/Urigo/graphql-mesh/commit/df37c40f47c6c53949f5d5f71e062c09fe5e1bd0) Thanks [@ardatan](https://github.com/ardatan)! - Drop webhook plugin and automatically handle webhooks. See the documentation for more information

- [#4369](https://github.com/Urigo/graphql-mesh/pull/4369) [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b) Thanks [@gilgardosh](https://github.com/gilgardosh)! - Introduce "destructObject" in query stringify options to spread the parameter content into the query parameters in order to support OAS explode: true behavior with query parameters that are objects

- [#4375](https://github.com/Urigo/graphql-mesh/pull/4375) [`0b3517539`](https://github.com/Urigo/graphql-mesh/commit/0b3517539024b1ae63a046c8ba6bedfb111a7395) Thanks [@ardatan](https://github.com/ardatan)! - `multipart/form-data` and **File Uploads** support (`type: string`, `format: binary`)

  If there is `type: string` and `format: binary` definitions in a schema type definition, it is considered as `File` scalar type and resolved as **WHATWG** [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) object.
  When the request content-type is `multipart/form-data`, the handler creates a **WHATWG** [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/File) object and puts the input arguments in it.

- [#4379](https://github.com/Urigo/graphql-mesh/pull/4379) [`7f0d02686`](https://github.com/Urigo/graphql-mesh/commit/7f0d026868b55e011d26fe41ecbb5173e9d195ed) Thanks [@ardatan](https://github.com/ardatan)! - Support readOnly and writeOnly. Now the fields flagged as writeOnly are not included in object types while writeOnly ones are not included in the input types, too.

### Patch Changes

- [#4405](https://github.com/Urigo/graphql-mesh/pull/4405) [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88) Thanks [@ardatan](https://github.com/ardatan)! - Handle multiple content types correctly

- [#4405](https://github.com/Urigo/graphql-mesh/pull/4405) [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88) Thanks [@ardatan](https://github.com/ardatan)! - Remove properties if an array definition has one

- [#4405](https://github.com/Urigo/graphql-mesh/pull/4405) [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88) Thanks [@ardatan](https://github.com/ardatan)! - Skip creating a scalar type if the given pattern is invalid

- Updated dependencies [[`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`5742f4598`](https://github.com/Urigo/graphql-mesh/commit/5742f4598fe32bbbdb78b65ea8d6e1e4723308aa), [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b), [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b), [`3473a2686`](https://github.com/Urigo/graphql-mesh/commit/3473a2686284f824b46af823ff4be42ae5c008f8), [`df37c40f4`](https://github.com/Urigo/graphql-mesh/commit/df37c40f47c6c53949f5d5f71e062c09fe5e1bd0), [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88), [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88), [`e69462cac`](https://github.com/Urigo/graphql-mesh/commit/e69462cac667c4ffb2d9ba35adeef15264d263fd), [`12ae4469a`](https://github.com/Urigo/graphql-mesh/commit/12ae4469aa89d613bfd36a87579adc1ae62c4a1f), [`30bac0246`](https://github.com/Urigo/graphql-mesh/commit/30bac0246d4d8e58aaee2011c1178b4334c42a88), [`06904b29d`](https://github.com/Urigo/graphql-mesh/commit/06904b29d36cbad1d604fff5e6558d248570e78b), [`d87907736`](https://github.com/Urigo/graphql-mesh/commit/d87907736588520628acb32d9a83e3d39dba7b2f), [`0b3517539`](https://github.com/Urigo/graphql-mesh/commit/0b3517539024b1ae63a046c8ba6bedfb111a7395), [`7a4023a2c`](https://github.com/Urigo/graphql-mesh/commit/7a4023a2cac2dacc8e78e10dabee65427b9a5e54), [`7f0d02686`](https://github.com/Urigo/graphql-mesh/commit/7f0d026868b55e011d26fe41ecbb5173e9d195ed), [`15f315959`](https://github.com/Urigo/graphql-mesh/commit/15f315959f4eb70327e3df4c97fa081b75021f5f)]:
  - @graphql-mesh/cross-helpers@0.2.3
  - @graphql-mesh/types@0.81.0
  - @graphql-mesh/utils@0.41.0
  - @omnigraph/json-schema@0.32.0
  - json-machete@0.14.0

## 0.13.0

### Minor Changes

- [#4364](https://github.com/Urigo/graphql-mesh/pull/4364) [`32b3a63c2`](https://github.com/Urigo/graphql-mesh/commit/32b3a63c29a823dde830f7571a2e5b0213e03b12) Thanks [@ardatan](https://github.com/ardatan)! - - Respect `explode: true` or `explode: false` in query parameter definitions in OAS
  - Introduce a new `queryStringOptionsByParam` option to define `queryStringOptions` for each query parameter

### Patch Changes

- Updated dependencies [[`32b3a63c2`](https://github.com/Urigo/graphql-mesh/commit/32b3a63c29a823dde830f7571a2e5b0213e03b12)]:
  - @omnigraph/json-schema@0.31.0

## 0.12.0

### Minor Changes

- [#4357](https://github.com/Urigo/graphql-mesh/pull/4357) [`be79b20a5`](https://github.com/Urigo/graphql-mesh/commit/be79b20a59b14d5d79bfeb260e4ecabc58c26efb) Thanks [@gilgardosh](https://github.com/gilgardosh)! - BREAKING CHANGE: instead of oasFilePath, use source instead

### Patch Changes

- Updated dependencies [[`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824), [`be79b20a5`](https://github.com/Urigo/graphql-mesh/commit/be79b20a59b14d5d79bfeb260e4ecabc58c26efb), [`b5c59ffce`](https://github.com/Urigo/graphql-mesh/commit/b5c59ffceae7091f8d2b98ee548890acdbd57824)]:
  - @graphql-mesh/utils@0.40.0
  - json-machete@0.13.2
  - @graphql-mesh/types@0.80.2
  - @omnigraph/json-schema@0.30.0

## 0.11.2

### Patch Changes

- Updated dependencies [[`cd13405f5`](https://github.com/Urigo/graphql-mesh/commit/cd13405f5b358af364158c7b5fd36fa08b1d4a60)]:
  - @omnigraph/json-schema@0.29.2

## 0.11.1

### Patch Changes

- Updated dependencies [[`f23e14eba`](https://github.com/Urigo/graphql-mesh/commit/f23e14ebaf7c6a869207edc43b0e2a8114d0d21f)]:
  - @graphql-mesh/utils@0.39.0
  - json-machete@0.13.1
  - @omnigraph/json-schema@0.29.1
  - @graphql-mesh/types@0.80.1

## 0.11.0

### Minor Changes

- [#4342](https://github.com/Urigo/graphql-mesh/pull/4342) [`ca6d6206b`](https://github.com/Urigo/graphql-mesh/commit/ca6d6206b02dfaa42eafa83442a04b33bbdf2db9) Thanks [@gilgardosh](https://github.com/gilgardosh)! - ## Some improvements on OAS handling
  - If there are no parameters defined in OAS links, the handler exposes the arguments of the original operation.
  - If the name of the link definition is not valid for GraphQL, the handler sanitizes it.

* [#4327](https://github.com/Urigo/graphql-mesh/pull/4327) [`f882aca38`](https://github.com/Urigo/graphql-mesh/commit/f882aca388380ad9dff1d618424e8a36b8607319) Thanks [@gilgardosh](https://github.com/gilgardosh)! - ## BREAKING CHANGES
  - Named types are no longer deduplicated automatically, so this might introduce new types on your side. Also the types with unknown content are always reflected as "JSON"/"Any" scalar type
  - `noDeduplicate` option has been dropped, because it is no longer needed.

### Patch Changes

- [#4343](https://github.com/Urigo/graphql-mesh/pull/4343) [`ab89f98cf`](https://github.com/Urigo/graphql-mesh/commit/ab89f98cf7b9a0dceb3b03aed5528b001c3f2496) Thanks [@gilgardosh](https://github.com/gilgardosh)! - Add \_ prefix if the type is Subscription to avoid conflict with the root "Subscription" type

* [#4343](https://github.com/Urigo/graphql-mesh/pull/4343) [`ab89f98cf`](https://github.com/Urigo/graphql-mesh/commit/ab89f98cf7b9a0dceb3b03aed5528b001c3f2496) Thanks [@gilgardosh](https://github.com/gilgardosh)! - Some additional tests

* Updated dependencies [[`de7081cdb`](https://github.com/Urigo/graphql-mesh/commit/de7081cdbb4c6ddb8ff60ac15089a19f70ee3a3a), [`ab89f98cf`](https://github.com/Urigo/graphql-mesh/commit/ab89f98cf7b9a0dceb3b03aed5528b001c3f2496), [`de7081cdb`](https://github.com/Urigo/graphql-mesh/commit/de7081cdbb4c6ddb8ff60ac15089a19f70ee3a3a), [`ca6d6206b`](https://github.com/Urigo/graphql-mesh/commit/ca6d6206b02dfaa42eafa83442a04b33bbdf2db9), [`f882aca38`](https://github.com/Urigo/graphql-mesh/commit/f882aca388380ad9dff1d618424e8a36b8607319)]:
  - @omnigraph/json-schema@0.29.0
  - json-machete@0.13.0
  - @graphql-mesh/types@0.80.0
  - @graphql-mesh/utils@0.38.1

## 0.10.0

### Minor Changes

- [#4322](https://github.com/Urigo/graphql-mesh/pull/4322) [`738335788`](https://github.com/Urigo/graphql-mesh/commit/7383357880685447189085204c984e632d36aa61) Thanks [@ardatan](https://github.com/ardatan)! - POSSIBLE BREAKING CHANGE:
  Previously if the parameter name was not valid for GraphQL and sanitized like `product-tag` to `product_tag`, it was ignored. Now it has been fixed but this change might be a breaking change for you if the actual parameter schema is `integer` while it is represented as `string` today.
  This also fixes an issue with ignored default values.

### Patch Changes

- Updated dependencies [[`738335788`](https://github.com/Urigo/graphql-mesh/commit/7383357880685447189085204c984e632d36aa61)]:
  - @omnigraph/json-schema@0.28.0

## 0.9.0

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

## 0.8.2

### Patch Changes

- Updated dependencies [[`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`991373717`](https://github.com/Urigo/graphql-mesh/commit/99137371708b7fe12b32dfcfe93d535507a7f968), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2), [`a2e59dfdd`](https://github.com/Urigo/graphql-mesh/commit/a2e59dfdd70b8a7bc0e9d658ff1a53029757eaa2)]:
  - @graphql-mesh/cross-helpers@0.2.2
  - @graphql-mesh/string-interpolation@0.3.1
  - @graphql-mesh/types@0.78.8
  - @graphql-mesh/utils@0.37.9
  - @omnigraph/json-schema@0.26.2
  - json-machete@0.11.2

## 0.8.1

### Patch Changes

- Updated dependencies [[`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73), [`db10974ea`](https://github.com/Urigo/graphql-mesh/commit/db10974eaa422967b3ce0ff0101ae97bca3ebf73)]:
  - @graphql-mesh/cross-helpers@0.2.1
  - @graphql-mesh/types@0.78.7
  - @graphql-mesh/utils@0.37.8
  - @omnigraph/json-schema@0.26.1
  - json-machete@0.11.1

## 0.8.0

### Minor Changes

- [#4262](https://github.com/Urigo/graphql-mesh/pull/4262) [`be784e653`](https://github.com/Urigo/graphql-mesh/commit/be784e6533f0c66774d1251382082f0a426e0978) Thanks [@ardatan](https://github.com/ardatan)! - Handle callbacks as GraphQL Subscriptions

* [#4247](https://github.com/Urigo/graphql-mesh/pull/4247) [`31fc25974`](https://github.com/Urigo/graphql-mesh/commit/31fc259744b77a6a649487562f59e97f2e08e3aa) Thanks [@ardatan](https://github.com/ardatan)! - Accept a code file for `operationHeaders`

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

- [#4262](https://github.com/Urigo/graphql-mesh/pull/4262) [`be784e653`](https://github.com/Urigo/graphql-mesh/commit/be784e6533f0c66774d1251382082f0a426e0978) Thanks [@ardatan](https://github.com/ardatan)! - Refactor runtime expression handling in OpenAPI & JSON Schema handlers

- Updated dependencies [[`be784e653`](https://github.com/Urigo/graphql-mesh/commit/be784e6533f0c66774d1251382082f0a426e0978), [`be784e653`](https://github.com/Urigo/graphql-mesh/commit/be784e6533f0c66774d1251382082f0a426e0978), [`31fc25974`](https://github.com/Urigo/graphql-mesh/commit/31fc259744b77a6a649487562f59e97f2e08e3aa)]:
  - @omnigraph/json-schema@0.26.0

## 0.7.11

### Patch Changes

- [#4246](https://github.com/Urigo/graphql-mesh/pull/4246) [`d0498f79b`](https://github.com/Urigo/graphql-mesh/commit/d0498f79bfc43060d279bad329337de307c13118) Thanks [@ardatan](https://github.com/ardatan)! - Respect "noDeduplication" flag while creating the bundle

* [#4239](https://github.com/Urigo/graphql-mesh/pull/4239) [`755d3d487`](https://github.com/Urigo/graphql-mesh/commit/755d3d487c3069664a96e71732fa25aa2d161b1b) Thanks [@ardatan](https://github.com/ardatan)! - - Set response type to "String" if the response content type is "text/\*" defined in the OpenAPI document
  - Fix the issue when "allOf" or "anyOf" is used with an enum type and an object type
* Updated dependencies [[`755d3d487`](https://github.com/Urigo/graphql-mesh/commit/755d3d487c3069664a96e71732fa25aa2d161b1b), [`669abf58f`](https://github.com/Urigo/graphql-mesh/commit/669abf58f86faf5f9d678cf9ad103143488960d6)]:
  - @omnigraph/json-schema@0.25.0
  - json-machete@0.11.0

## 0.7.10

### Patch Changes

- [#4237](https://github.com/Urigo/graphql-mesh/pull/4237) [`02c018249`](https://github.com/Urigo/graphql-mesh/commit/02c0182498e60c78bee5c44c42dc897a739e8f18) Thanks [@ardatan](https://github.com/ardatan)! - - Respect `pattern` of `number` types
  - Dereference first-level circular dependencies properly in `dereferenceObject`
  - Do not make the schema single if there is one `allOf` or `anyOf` element but with properties

* [#4216](https://github.com/Urigo/graphql-mesh/pull/4216) [`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b) Thanks [@ardatan](https://github.com/ardatan)! - Rewrite JSON Schema visitor and support circular dependencies in a better way

  Now `visitJSONSchema` takes two different visitor functions instead of `enter` and `leave`, previously we used to handle only `leave`.

  Also `generateInterfaceFromSharedFields` has been dropped for now because it wasn't working as expected.

- [#4221](https://github.com/Urigo/graphql-mesh/pull/4221) [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834) Thanks [@ardatan](https://github.com/ardatan)! - Respect "\$ref" in parameters

* [#4221](https://github.com/Urigo/graphql-mesh/pull/4221) [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834) Thanks [@ardatan](https://github.com/ardatan)! - Respect global parameters object on top of method objects like;
  ```yml
  parameters: # Take this as well
    - name: foo
      ...
  get:
    parameters:
      - name: bar
  ```
* Updated dependencies [[`78552ab23`](https://github.com/Urigo/graphql-mesh/commit/78552ab2387450dfa406fa6d5f49ae6f46b0c410), [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834), [`02c018249`](https://github.com/Urigo/graphql-mesh/commit/02c0182498e60c78bee5c44c42dc897a739e8f18), [`f95036a33`](https://github.com/Urigo/graphql-mesh/commit/f95036a3360bd76d9f4b9e2725f4d344343fe41b), [`12430d907`](https://github.com/Urigo/graphql-mesh/commit/12430d907ead31fdd5eda532f8087f392a155834), [`961e07113`](https://github.com/Urigo/graphql-mesh/commit/961e07113161a54823644a1fecb39e2b5066544e)]:
  - @omnigraph/json-schema@0.24.6
  - json-machete@0.10.6
  - @graphql-mesh/utils@0.37.7
  - @graphql-mesh/types@0.78.6

## 0.7.9

### Patch Changes

- 583da37fc: Fix an issue while concatenating query parameters for POST requests

  Before;
  `http://localhost:3000/test?foo=barbaz=qux`

  After;
  `http://localhost:3000/test?foo=bar&barbaz=qux`

## 0.7.8

### Patch Changes

- Updated dependencies [c88a34d82]
  - @omnigraph/json-schema@0.24.5
  - @graphql-mesh/types@0.78.5
  - @graphql-mesh/utils@0.37.6
  - json-machete@0.10.5

## 0.7.7

### Patch Changes

- Updated dependencies [30d046724]
  - @graphql-mesh/utils@0.37.5
  - json-machete@0.10.4
  - @omnigraph/json-schema@0.24.4
  - @graphql-mesh/types@0.78.4

## 0.7.6

### Patch Changes

- Updated dependencies [738e2f378]
  - @omnigraph/json-schema@0.24.3
  - @graphql-mesh/types@0.78.3
  - @graphql-mesh/utils@0.37.4
  - json-machete@0.10.3

## 0.7.5

### Patch Changes

- a2ef35c35: ** Use the new `@whatwg-node/fetch` package instead of `cross-undici-fetch`**

  `cross-undici-fetch` has been renamed to `@whatwg-node-fetch`. Now Mesh uses this new package.

  ** BREAKING: Drop `serve.handlers` in favor of the new plugin system **

  Now Mesh uses the new plugin system of GraphQL Yoga that uses WHATWG Fetch API instead of Node specific `serve.handlers`. That means you can use those plugins with any environment even if you are not using Node.js with `mesh start`.

  Please check our docs to see how you can migrate to the new usage.
  https://www.graphql-mesh.com/docs/guides/subscriptions-webhooks#handle-webhook-http-requests

- Updated dependencies [bad0f40ab]
- Updated dependencies [a2ef35c35]
  - @omnigraph/json-schema@0.24.2
  - json-machete@0.10.2
  - @graphql-mesh/types@0.78.2
  - @graphql-mesh/utils@0.37.3

## 0.7.4

### Patch Changes

- @graphql-mesh/types@0.78.1
- @omnigraph/json-schema@0.24.1
- @graphql-mesh/utils@0.37.2
- json-machete@0.10.1

## 0.7.3

### Patch Changes

- Updated dependencies [eade5bb9f]
- Updated dependencies [6e6fd4ab7]
- Updated dependencies [bcd9355ee]
  - json-machete@0.10.0
  - @omnigraph/json-schema@0.24.0
  - @graphql-mesh/utils@0.37.1
  - @graphql-mesh/types@0.78.0

## 0.7.2

### Patch Changes

- Updated dependencies [66f5d0189]
- Updated dependencies [0401c7617]
  - @graphql-mesh/types@0.77.1
  - @graphql-mesh/cross-helpers@0.2.0
  - @omnigraph/json-schema@0.23.0
  - @graphql-mesh/utils@0.37.0
  - json-machete@0.9.2

## 0.7.1

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
  - @graphql-mesh/utils@0.36.1

## 0.7.0

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

## 0.6.16

### Patch Changes

- Updated dependencies [d4754ad08]
- Updated dependencies [2df026e90]
  - @graphql-mesh/types@0.75.0
  - @omnigraph/json-schema@0.20.7
  - @graphql-mesh/utils@0.35.7
  - json-machete@0.8.15

## 0.6.15

### Patch Changes

- Updated dependencies [ed9ba7f48]
  - @graphql-mesh/types@0.74.2
  - @graphql-mesh/utils@0.35.6
  - @omnigraph/json-schema@0.20.6
  - json-machete@0.8.14

## 0.6.14

### Patch Changes

- Updated dependencies [41cfb46b4]
  - @graphql-mesh/utils@0.35.5
  - json-machete@0.8.13
  - @omnigraph/json-schema@0.20.5
  - @graphql-mesh/types@0.74.1

## 0.6.13

### Patch Changes

- Updated dependencies [13b9b30f7]
  - @graphql-mesh/string-interpolation@0.3.0
  - @graphql-mesh/types@0.74.0
  - @omnigraph/json-schema@0.20.4
  - @graphql-mesh/utils@0.35.4
  - json-machete@0.8.12

## 0.6.12

### Patch Changes

- Updated dependencies [9733f490c]
  - @graphql-mesh/utils@0.35.3
  - json-machete@0.8.11
  - @omnigraph/json-schema@0.20.3
  - @graphql-mesh/types@0.73.3

## 0.6.11

### Patch Changes

- 3c0366d2c: - Support import.meta.env instead of process.env for browsers
  - Ponyfill `util.inspect` only if it is not Node env
- Updated dependencies [3c0366d2c]
- Updated dependencies [3c0366d2c]
  - @graphql-mesh/cross-helpers@0.1.6
  - json-machete@0.8.10
  - @omnigraph/json-schema@0.20.2
  - @graphql-mesh/utils@0.35.2
  - @graphql-mesh/types@0.73.2

## 0.6.10

### Patch Changes

- Updated dependencies [abe9fcc41]
  - @graphql-mesh/utils@0.35.1
  - json-machete@0.8.9
  - @omnigraph/json-schema@0.20.1
  - @graphql-mesh/types@0.73.1

## 0.6.9

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
  - @graphql-mesh/string-interpolation@0.2.0
  - @graphql-mesh/types@0.73.0
  - @graphql-mesh/utils@0.35.0

## 0.6.8

### Patch Changes

- Updated dependencies [43eb3d2c2]
  - @graphql-mesh/utils@0.34.10
  - json-machete@0.8.7
  - @omnigraph/json-schema@0.19.8
  - @graphql-mesh/types@0.72.5

## 0.6.7

### Patch Changes

- Updated dependencies [55ad5ea44]
  - @graphql-mesh/utils@0.34.9
  - json-machete@0.8.6
  - @omnigraph/json-schema@0.19.7
  - @graphql-mesh/types@0.72.4

## 0.6.6

### Patch Changes

- Updated dependencies [31efa964e]
  - @graphql-mesh/utils@0.34.8
  - json-machete@0.8.5
  - @omnigraph/json-schema@0.19.6
  - @graphql-mesh/types@0.72.3

## 0.6.5

### Patch Changes

- json-machete@0.8.4
- @graphql-mesh/utils@0.34.7
- @graphql-mesh/types@0.72.2
- @omnigraph/json-schema@0.19.5

## 0.6.4

### Patch Changes

- Updated dependencies [b9beacca2]
  - json-machete@0.8.3
  - @omnigraph/json-schema@0.19.4
  - @graphql-mesh/utils@0.34.6
  - @graphql-mesh/types@0.72.1

## 0.6.3

### Patch Changes

- Updated dependencies [fa2542468]
  - @graphql-mesh/types@0.72.0
  - @omnigraph/json-schema@0.19.3
  - @graphql-mesh/utils@0.34.5
  - json-machete@0.8.2

## 0.6.2

### Patch Changes

- Updated dependencies [ddbbec8a8]
  - @graphql-mesh/utils@0.34.4
  - json-machete@0.8.1
  - @omnigraph/json-schema@0.19.2
  - @graphql-mesh/types@0.71.4

## 0.6.1

### Patch Changes

- 2e9addd80: Bump cross-undici-fetch for Node 18 compat
- Updated dependencies [2e9addd80]
- Updated dependencies [2e9addd80]
  - json-machete@0.8.0
  - @omnigraph/json-schema@0.19.1
  - @graphql-mesh/utils@0.34.3
  - @graphql-mesh/types@0.71.3

## 0.6.0

### Minor Changes

- 2f395a4b2: feat(openapi): support empty values

### Patch Changes

- Updated dependencies [2f395a4b2]
  - @omnigraph/json-schema@0.19.0

## 0.5.2

### Patch Changes

- @graphql-mesh/types@0.71.2
- @omnigraph/json-schema@0.18.2
- @graphql-mesh/utils@0.34.2
- json-machete@0.7.15

## 0.5.1

### Patch Changes

- 7856f92d3: Bump all packages
- Updated dependencies [7856f92d3]
  - json-machete@0.7.14
  - @omnigraph/json-schema@0.18.1
  - @graphql-mesh/types@0.71.1
  - @graphql-mesh/utils@0.34.1

## 0.5.0

### Minor Changes

- 331b62637: feat(json-schema/openapi): support OpenAPI links and json pointer syntax in string interpolation

### Patch Changes

- 331b62637: fix(openapi): sanitize operationId before settings it as a GraphQL field name in the root type
- 331b62637: fix(openapi): handle empty responses(204) correctly
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

## 0.4.9

### Patch Changes

- json-machete@0.7.12
- @graphql-mesh/utils@0.33.6
- @omnigraph/json-schema@0.17.26
- @graphql-mesh/types@0.70.6

## 0.4.8

### Patch Changes

- @graphql-mesh/types@0.70.5
- @omnigraph/json-schema@0.17.25
- @graphql-mesh/utils@0.33.5
- json-machete@0.7.11

## 0.4.7

### Patch Changes

- Updated dependencies [35a55e841]
  - json-machete@0.7.10
  - @omnigraph/json-schema@0.17.24
  - @graphql-mesh/types@0.70.4
  - @graphql-mesh/utils@0.33.4

## 0.4.6

### Patch Changes

- @graphql-mesh/types@0.70.3
- @omnigraph/json-schema@0.17.23
- @graphql-mesh/utils@0.33.3
- json-machete@0.7.9

## 0.4.5

### Patch Changes

- Updated dependencies [d64c74b75]
  - json-machete@0.7.8
  - @omnigraph/json-schema@0.17.22

## 0.4.4

### Patch Changes

- Updated dependencies [b02f5b008]
- Updated dependencies [114629e47]
  - @graphql-mesh/types@0.70.2
  - json-machete@0.7.7
  - @omnigraph/json-schema@0.17.21
  - @graphql-mesh/utils@0.33.2

## 0.4.3

### Patch Changes

- Updated dependencies [26e69dbe9]
  - @omnigraph/json-schema@0.17.20

## 0.4.2

### Patch Changes

- 2d5c6c72a: add Git repository link in package.json
- Updated dependencies [2d5c6c72a]
  - json-machete@0.7.6
  - @omnigraph/json-schema@0.17.19
  - @graphql-mesh/types@0.70.1
  - @graphql-mesh/utils@0.33.1

## 0.4.1

### Patch Changes

- Updated dependencies [d567be7b5]
  - @graphql-mesh/types@0.70.0
  - @graphql-mesh/utils@0.33.0
  - @omnigraph/json-schema@0.17.18
  - json-machete@0.7.5

## 0.4.0

### Minor Changes

- f30dba61e: feat(openapi): add fallbackFormat

### Patch Changes

- Updated dependencies [f30dba61e]
  - @graphql-mesh/types@0.69.0
  - @omnigraph/json-schema@0.17.17
  - @graphql-mesh/utils@0.32.2
  - json-machete@0.7.4

## 0.3.28

### Patch Changes

- Updated dependencies [c53203723]
  - json-machete@0.7.3
  - @omnigraph/json-schema@0.17.16

## 0.3.27

### Patch Changes

- e67f6a621: fix(openapi): handle argTypeMap correctly
- Updated dependencies [c6f0314ac]
  - json-machete@0.7.2
  - @omnigraph/json-schema@0.17.15

## 0.3.26

### Patch Changes

- 3448c3177: fix(openapi): sanitize dynamic argument names
  - @omnigraph/json-schema@0.17.14
  - @graphql-mesh/utils@0.32.1
  - json-machete@0.7.1

## 0.3.25

### Patch Changes

- Updated dependencies [67fb11706]
  - json-machete@0.7.0
  - @graphql-mesh/utils@0.32.0
  - @omnigraph/json-schema@0.17.13

## 0.3.24

### Patch Changes

- Updated dependencies [b2c537c2a]
  - @graphql-mesh/utils@0.31.0
  - json-machete@0.6.1
  - @omnigraph/json-schema@0.17.12

## 0.3.23

### Patch Changes

- Updated dependencies [b45dac0c0]
- Updated dependencies [b45dac0c0]
  - json-machete@0.6.0
  - @omnigraph/json-schema@0.17.11

## 0.3.22

### Patch Changes

- @omnigraph/json-schema@0.17.10
- @graphql-mesh/utils@0.30.2
- json-machete@0.5.20

## 0.3.21

### Patch Changes

- @omnigraph/json-schema@0.17.9
- @graphql-mesh/utils@0.30.1
- json-machete@0.5.19

## 0.3.20

### Patch Changes

- Updated dependencies [01bac6bb5]
- Updated dependencies [01bac6bb5]
  - @omnigraph/json-schema@0.17.8
  - @graphql-mesh/utils@0.30.0
  - json-machete@0.5.18

## 0.3.19

### Patch Changes

- Updated dependencies [268db0462]
  - @graphql-mesh/utils@0.29.0
  - json-machete@0.5.17
  - @omnigraph/json-schema@0.17.7

## 0.3.18

### Patch Changes

- @omnigraph/json-schema@0.17.6
- @graphql-mesh/utils@0.28.5
- json-machete@0.5.16

## 0.3.17

### Patch Changes

- @omnigraph/json-schema@0.17.5
- @graphql-mesh/utils@0.28.4
- json-machete@0.5.15

## 0.3.16

### Patch Changes

- Updated dependencies [f11d8b9c8]
  - @omnigraph/json-schema@0.17.4
  - @graphql-mesh/utils@0.28.3
  - json-machete@0.5.14

## 0.3.15

### Patch Changes

- Updated dependencies [fb876e99c]
  - @graphql-mesh/utils@0.28.2
  - @omnigraph/json-schema@0.17.3
  - json-machete@0.5.13

## 0.3.14

### Patch Changes

- @omnigraph/json-schema@0.17.2
- @graphql-mesh/utils@0.28.1
- json-machete@0.5.12

## 0.3.13

### Patch Changes

- 6f07de8fe: fix: do not import process from env
- b481fbc39: enhance: add tslib to dependencies to reduce bundle size
- Updated dependencies [6f07de8fe]
- Updated dependencies [6f07de8fe]
- Updated dependencies [b481fbc39]
  - @graphql-mesh/utils@0.28.0
  - @omnigraph/json-schema@0.17.1
  - json-machete@0.5.11

## 0.3.12

### Patch Changes

- c12e30ae5: fix(openapi): correct types for path params

## 0.3.11

### Patch Changes

- Updated dependencies [21de17a3d]
- Updated dependencies [3f4bb09a9]
  - @omnigraph/json-schema@0.17.0
  - @graphql-mesh/utils@0.27.9
  - json-machete@0.5.10

## 0.3.10

### Patch Changes

- @omnigraph/json-schema@0.16.2
- @graphql-mesh/utils@0.27.8
- json-machete@0.5.9

## 0.3.9

### Patch Changes

- Updated dependencies [ca6bb5ff3]
- Updated dependencies [ca6bb5ff3]
  - json-machete@0.5.8
  - @graphql-mesh/utils@0.27.7
  - @omnigraph/json-schema@0.16.1

## 0.3.8

### Patch Changes

- Updated dependencies [275f82b53]
  - @omnigraph/json-schema@0.16.0

## 0.3.7

### Patch Changes

- Updated dependencies [c84d9e95e]
  - @omnigraph/json-schema@0.15.1

## 0.3.6

### Patch Changes

- Updated dependencies [12256ec58]
- Updated dependencies [e3f941db5]
  - @omnigraph/json-schema@0.15.0
  - @graphql-mesh/utils@0.27.6
  - json-machete@0.5.7

## 0.3.5

### Patch Changes

- Updated dependencies [1815865c3]
  - @omnigraph/json-schema@0.14.3
  - @graphql-mesh/utils@0.27.5
  - json-machete@0.5.6

## 0.3.4

### Patch Changes

- @omnigraph/json-schema@0.14.2
- @graphql-mesh/utils@0.27.4
- json-machete@0.5.5

## 0.3.3

### Patch Changes

- @omnigraph/json-schema@0.14.1
- @graphql-mesh/utils@0.27.3
- json-machete@0.5.4

## 0.3.2

### Patch Changes

- 0454c0f8a: fix(openapi): Interpolated required argument should be ID! not String!

## 0.3.1

### Patch Changes

- a00a88a97: fix(openapi): fix an issue when an arg is required

## 0.3.0

### Minor Changes

- 15e1f68c5: feat(json-schema): respect given samples in mocks transform

### Patch Changes

- Updated dependencies [c71b29004]
- Updated dependencies [15e1f68c5]
  - @graphql-mesh/utils@0.27.2
  - @omnigraph/json-schema@0.14.0
  - json-machete@0.5.3

## 0.2.0

### Minor Changes

- 240ec7b38: feat(openapi): selectQueryOrMutationField flag to choose what field belongs to what root type

### Patch Changes

- Updated dependencies [fcbd12a35]
- Updated dependencies [3a21004c9]
  - @graphql-mesh/utils@0.27.1
  - @omnigraph/json-schema@0.13.6
  - json-machete@0.5.2

## 0.1.7

### Patch Changes

- fb974bf73: fix(openapi): escape slashes in the content mimetype keys

## 0.1.6

### Patch Changes

- Updated dependencies [05ec30255]
  - @omnigraph/json-schema@0.13.5

## 0.1.5

### Patch Changes

- Updated dependencies [1c8827604]
  - json-machete@0.5.1
  - @omnigraph/json-schema@0.13.4

## 0.1.4

### Patch Changes

- Updated dependencies [49e9ca808]
- Updated dependencies [49e9ca808]
  - json-machete@0.5.0
  - @omnigraph/json-schema@0.13.3

## 0.1.3

### Patch Changes

- Updated dependencies [900a01355]
  - @graphql-mesh/utils@0.27.0
  - json-machete@0.4.3
  - @omnigraph/json-schema@0.13.2

## 0.1.2

### Patch Changes

- @omnigraph/json-schema@0.13.1
- @graphql-mesh/utils@0.26.4
- json-machete@0.4.2

## 0.1.1

### Patch Changes

- Updated dependencies [a79268b3a]
  - @omnigraph/json-schema@0.13.0
  - @graphql-mesh/utils@0.26.3
  - json-machete@0.4.1

## 0.1.0

### Minor Changes

- 020431bdc: feat(json-schema/openapi/raml): respect error status codes

### Patch Changes

- Updated dependencies [020431bdc]
- Updated dependencies [020431bdc]
  - json-machete@0.4.0
  - @omnigraph/json-schema@0.12.0
  - @graphql-mesh/utils@0.26.2

## 0.0.8

### Patch Changes

- 50684ddbf: fix(openapi): add lowercased method prefix
- Updated dependencies [113091148]
- Updated dependencies [6bb4cf673]
  - @graphql-mesh/utils@0.26.1
  - @omnigraph/json-schema@0.11.2
  - json-machete@0.3.7

## 0.0.7

### Patch Changes

- Updated dependencies [92d687133]
- Updated dependencies [92d687133]
- Updated dependencies [92d687133]
  - @omnigraph/json-schema@0.11.1
  - json-machete@0.3.6

## 0.0.6

### Patch Changes

- Updated dependencies [b69233517]
  - @omnigraph/json-schema@0.11.0

## 0.0.5

### Patch Changes

- Updated dependencies [6d76179e4]
  - @omnigraph/json-schema@0.10.0

## 0.0.4

### Patch Changes

- Updated dependencies [e30494c95]
  - @omnigraph/json-schema@0.9.0

## 0.0.3

### Patch Changes

- Updated dependencies [8e52fd06a]
- Updated dependencies [1ab0aebbc]
- Updated dependencies [56e2257fa]
- Updated dependencies [56e2257fa]
  - json-machete@0.3.5
  - @omnigraph/json-schema@0.8.0
  - @graphql-mesh/utils@0.26.0

## 0.0.2

### Patch Changes

- Updated dependencies [2b876f2b8]
  - @graphql-mesh/utils@0.25.0
  - json-machete@0.3.4
  - @omnigraph/json-schema@0.7.4

## 0.0.1

### Patch Changes

- d907351c5: new OpenAPI Handler
- Updated dependencies [d907351c5]
- Updated dependencies [80eb8e92b]
- Updated dependencies [d907351c5]
- Updated dependencies [d907351c5]
  - json-machete@0.3.3
  - @omnigraph/json-schema@0.7.3
  - @graphql-mesh/utils@0.24.2
