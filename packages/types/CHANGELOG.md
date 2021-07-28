# @graphql-mesh/types

## 0.43.0

### Minor Changes

- 885ea439a: New MeshStore approach

### Patch Changes

- d8051f87d: GraphQLHandler endpoint validation

## 0.42.0

### Minor Changes

- cfb517b3d: feat(types): make baseDir optional

## 0.41.1

### Patch Changes

- e6acdbd7d: enhance(runtime): do not compose unnecessary resolvers

## 0.41.0

### Minor Changes

- 214b7a23c: feat(runtime): Type Merging support

## 0.40.0

### Minor Changes

- 0d2f7bfcd: Added the config option `useWebSocketLegacyProtocol` for the graphql handler that enables the use of the `graphql-ws` protocol for subscriptions to the handlers source.

## 0.39.0

### Minor Changes

- 6c90e0e39: Add wrap mode to resolvers-composition transform (#1928)

## 0.38.0

### Minor Changes

- 346fe9c61: Performance improvements and OData fixes

## 0.37.0

### Minor Changes

- 4b57f7496: feat(serve): ability to configure opening browser window feature
- 4b57f7496: support introspection cache

## 0.36.1

### Patch Changes

- b77148a04: fix(npm-publish): bump all versions to publish again

## 0.36.0

### Minor Changes

- 634a8a134: feat(config): introduce introspection cache

### Patch Changes

- 6b8b23a4e: feat(openapi): allow source spec inline injection

## 0.35.1

### Patch Changes

- 191a663a: fix(types): baseUrl doesn't need to be required

## 0.35.0

### Minor Changes

- b9ca0c30: Make Transforms and Handlers base-dir aware

## 0.34.1

### Patch Changes

- 55327fd6: fix(config): support arrays and singular values for additionalTypeDefs

## 0.34.0

### Minor Changes

- 76051dd7: feat(serve): ability to change GraphQL endpoint path

## 0.33.0

### Minor Changes

- 646d6bdb: feat(rename-transform): add bare option

## 0.32.0

### Minor Changes

- 68d6b117: feat(postgraphile): add ability to disable live queries and subscriptions

## 0.31.1

### Patch Changes

- 212f2d66: fix(postgraphile): caching

## 0.31.0

### Minor Changes

- 77327988: feat(runtime): Live Queries Support

## 0.30.1

### Patch Changes

- 48f38a4a: fix(config): allow array of strings in cors configuration

## 0.30.0

### Minor Changes

- 938cca26: feat(json-schema): allow custom error property with errorMessageField

## 0.29.4

### Patch Changes

- 8ef29de1: feat(soap): ability to provide custom headers

## 0.29.3

### Patch Changes

- a02d86c3: feat(serve): add HTTPS support
- a02d86c3: fix(runtime): patch graphql-compose schemas to support @defer and @stream
- a02d86c3: feat(serve): ability to change binding hostname

## 0.29.2

### Patch Changes

- 8e8848e1: feat(serve): ability to change maxRequestBodySize

## 0.29.1

### Patch Changes

- e8994875: feat(serve): ability to change maxFileSize and maxFiles for graphql-upload

## 0.29.0

### Minor Changes

- 183cfa96: feat(grpc): add reflection and file descriptor set support

  This change adds two new features to the gRPC handler.

  - Reflection support
  - File descriptor set support

  Both of these features make it easier for `graphql-mesh` to automatically create a schema for gRPC.

  ### `useReflection: boolean`

  This config option enables `graphql-mesh` to generate a schema by querying the gRPC reflection endpoints. This feature is enabled by the [`grpc-reflection-js`](https://github.com/redhoyasa/grpc-reflection-js) package.

  ### `descriptorSetFilePath: object | string`

  This config option enabled `graphql-mesh` to generate a schema by importing either a binary-encoded file descriptor set file or a JSON file descriptor set file. This config works just like `protoFilePath` and can be a string or an object containing the file and proto loader options.

  Binary-encoded file descriptor sets can be created by using `protoc` with the `--descriptor_set_out` option. Example:

  ```sh
  protoc -I . --descriptor_set_out=./my-descriptor-set.bin ./my-rpc.proto
  ```

  JSON file descriptor sets can be created using [`protobufjs/protobuf.js`](https://github.com/protobufjs/protobuf.js#using-json-descriptors).

### Patch Changes

- c767df01: fix(fs): fix fs handling issues for non Node environments

## 0.28.0

### Minor Changes

- a22fc6f3: feat(openapi): customize target root type for an operation and generic payload argument name

## 0.27.0

### Minor Changes

- c1de3e43: feat(cli): add `playground` option to serve configuration

## 0.26.0

### Minor Changes

- 75f6dff9: feat(graphql): ability to disable batch execution
- c4f207a7: feat(postgraphile): ability to provide custom pgPool instance

## 0.25.0

### Minor Changes

- 0df817d0: feat(graphql): support exported schemaHeaders

## 0.24.0

### Minor Changes

- b6262481: feat(snapshot): add respectSelectionSet for advanced snapshot

## 0.23.3

### Patch Changes

- e5b38574: introduce extend transform

## 0.23.2

### Patch Changes

- c614e796: fix(types): fix config schema

## 0.23.1

### Patch Changes

- 59d77fb8: fix(encapsulate): fix transform config

## 0.23.0

### Minor Changes

- e5cd44f5: feat(rename): support rename transform

## 0.22.0

### Minor Changes

- 2fd59a83: feat(graphql): add useSSEForSubscription option to use SSE for Subscriptions instead of WebSocket

## 0.21.1

### Patch Changes

- c064e3a8: Fix minor issues with schema wrapping, updated types

## 0.21.0

### Minor Changes

- 03f41cd0: feat(graphql): support exported GraphQLSchema from code files

## 0.20.1

### Patch Changes

- 1e7fd602: feat(graphql): add `multipart` option to support file uploads

## 0.20.0

### Minor Changes

- 2d14fcc3: bump graphql-tools to v7

### Patch Changes

- 2d14fcc3: fix(json-schema): make method optional to create nonexecutable schema

## 0.19.0

### Minor Changes

- c1b073de: feat(runtime): support TypedDocumentNode

## 0.18.0

### Minor Changes

- 5628fb14: feat(mysql): add an ability to use existing Pool instance

## 0.17.1

### Patch Changes

- 0560e806: feat(fhir): new FHIR handler

## 0.17.0

### Minor Changes

- c26c8c56: feat(json-schema): support baseSchema

## 0.16.1

### Patch Changes

- 3770af72: feat(openapi): addLinitArgument is configurable

  fix(openapi): auto generated limit value is not mandatory

  fix(openapi): generate limit parameter for composed types

## 0.16.0

### Minor Changes

- 3ee10180: feat(json-schema): add argTypeMap to operation config to provide custom types for args

## 0.15.0

### Minor Changes

- 0f17c58c: feat(openapi): handle callbacks as subscriptions

## 0.14.1

### Patch Changes

- 937c87d2: Add 'useHTTPS' flag to gRPC config to allow SSL connections without providing a root CA

## 0.14.0

### Minor Changes

- 1e0445ee: feat(neo4j): add typeDefs option to provide custom schema

## 0.13.0

### Minor Changes

- b50a68e3: feat(serve): support cookies and static file serving

## 0.12.0

### Minor Changes

- e2b34219: improve introspection caching
- 9a7a55c4: feat(openapi): add sourceFormat option to provide schema format explicitly

## 0.11.3

### Patch Changes

- 2dedda3c: enhance(json-schema): support programmatic json schemas and improve caching
- a3b42cfd: fix(runtime): handle transforms correctly for single source

## 0.11.2

### Patch Changes

- 6d624576: fix(types): fix Any scalar type in json schema

## 0.11.1

### Patch Changes

- 405cec23: enhance(types): improve typings for PubSub

## 0.11.0

### Minor Changes

- 48d89de2: feat(runtime): replace hooks with pubsub logic

## 0.10.0

### Minor Changes

- 79adf4b6: feat(config): support functions as config property

## 0.9.2

### Patch Changes

- 2d5cc25b: chore(types): update config schema

## 0.9.1

### Patch Changes

- 93ad5255: fix(json-schema): update types

## 0.9.0

### Minor Changes

- c8d9695e: feat(cli): support --require flag to load dotenv etc

## 0.8.1

### Patch Changes

- d2e56567: fix(merging): prune schema while merging

## 0.8.0

### Minor Changes

- a789c312: feat(stitching): use batch execution

## 0.7.0

### Minor Changes

- 718e7a16: fix(runtime): fix browser support

## 0.6.0

### Minor Changes

- a76d74bb: feat(config): able to configure serve command in mesh config file

### Patch Changes

- 5067ac73: fix(serve): fix typo

## 0.5.1

### Patch Changes

- dde7878b: fix(runtime): handle empty arrays

## 0.5.0

### Minor Changes

- 705c4626: introduce an independent config package

## 0.4.0

### Minor Changes

- 6f21094b: feat(postgraphile): add more configuration options

### Patch Changes

- 854dc550: fix(localforage-cache): handle ttl better

## 0.3.1

### Patch Changes

- 3c131332: feat(cache): introduce new caching strategy localforage

## 0.3.0

### Minor Changes

- ccede377: Introduce includeHttpDetails to include HTTP response details to the result
