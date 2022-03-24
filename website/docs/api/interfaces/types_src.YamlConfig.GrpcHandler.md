---
title: 'GrpcHandler'
---

# Interface: GrpcHandler

[types/src](../modules/types_src).[YamlConfig](../modules/types_src.YamlConfig).GrpcHandler

Handler for gRPC and Protobuf schemas

## Table of contents

### Properties

- [credentialsSsl](types_src.YamlConfig.GrpcHandler#credentialsssl)
- [descriptorSetFilePath](types_src.YamlConfig.GrpcHandler#descriptorsetfilepath)
- [endpoint](types_src.YamlConfig.GrpcHandler#endpoint)
- [metaData](types_src.YamlConfig.GrpcHandler#metadata)
- [protoFilePath](types_src.YamlConfig.GrpcHandler#protofilepath)
- [requestTimeout](types_src.YamlConfig.GrpcHandler#requesttimeout)
- [useHTTPS](types_src.YamlConfig.GrpcHandler#usehttps)
- [useReflection](types_src.YamlConfig.GrpcHandler#usereflection)

## Properties

### credentialsSsl

• `Optional` **credentialsSsl**: [`GrpcCredentialsSsl`](types_src.YamlConfig.GrpcCredentialsSsl)

#### Defined in

[packages/types/src/config.ts:326](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L326)

___

### descriptorSetFilePath

• `Optional` **descriptorSetFilePath**: `string` | [`ProtoFilePath`](types_src.YamlConfig.ProtoFilePath)

Use a binary-encoded or JSON file descriptor set file (Any of: ProtoFilePath, String)

#### Defined in

[packages/types/src/config.ts:320](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L320)

___

### endpoint

• **endpoint**: `string`

gRPC Endpoint

#### Defined in

[packages/types/src/config.ts:312](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L312)

___

### metaData

• `Optional` **metaData**: `Object`

MetaData

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:334](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L334)

___

### protoFilePath

• `Optional` **protoFilePath**: `string` | [`ProtoFilePath`](types_src.YamlConfig.ProtoFilePath)

gRPC Proto file that contains your protobuf schema (Any of: ProtoFilePath, String)

#### Defined in

[packages/types/src/config.ts:316](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L316)

___

### requestTimeout

• `Optional` **requestTimeout**: `number`

Request timeout in milliseconds
Default: 200000

#### Defined in

[packages/types/src/config.ts:325](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L325)

___

### useHTTPS

• `Optional` **useHTTPS**: `boolean`

Use https instead of http for gRPC connection

#### Defined in

[packages/types/src/config.ts:330](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L330)

___

### useReflection

• `Optional` **useReflection**: `boolean`

Use gRPC reflection to automatically gather the connection

#### Defined in

[packages/types/src/config.ts:340](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L340)
