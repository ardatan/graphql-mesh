---
'@graphql-mesh/grpc': minor
'@graphql-mesh/types': minor
---

feat(grpc): add reflection and file descriptor set support

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