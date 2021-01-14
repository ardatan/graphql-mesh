# @graphql-mesh/types

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
