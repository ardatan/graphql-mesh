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
- [prefixQueryMethod](types_src.YamlConfig.GrpcHandler#prefixquerymethod)
- [protoFilePath](types_src.YamlConfig.GrpcHandler#protofilepath)
- [requestTimeout](types_src.YamlConfig.GrpcHandler#requesttimeout)
- [useHTTPS](types_src.YamlConfig.GrpcHandler#usehttps)
- [useReflection](types_src.YamlConfig.GrpcHandler#usereflection)

## Properties

### credentialsSsl

• `Optional` **credentialsSsl**: [`GrpcCredentialsSsl`](types_src.YamlConfig.GrpcCredentialsSsl)

#### Defined in

[packages/types/src/config.ts:343](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L343)

___

### descriptorSetFilePath

• `Optional` **descriptorSetFilePath**: `string` \| [`ProtoFilePath`](types_src.YamlConfig.ProtoFilePath)

Use a binary-encoded or JSON file descriptor set file (Any of: ProtoFilePath, String)

#### Defined in

[packages/types/src/config.ts:337](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L337)

___

### endpoint

• **endpoint**: `string`

gRPC Endpoint

#### Defined in

[packages/types/src/config.ts:329](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L329)

___

### metaData

• `Optional` **metaData**: `Object`

MetaData

#### Index signature

▪ [k: `string`]: `any`

#### Defined in

[packages/types/src/config.ts:351](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L351)

___

### prefixQueryMethod

• `Optional` **prefixQueryMethod**: `string`[]

prefix to collect Query method default: list, get

#### Defined in

[packages/types/src/config.ts:361](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L361)

___

### protoFilePath

• `Optional` **protoFilePath**: `string` \| [`ProtoFilePath`](types_src.YamlConfig.ProtoFilePath)

gRPC Proto file that contains your protobuf schema (Any of: ProtoFilePath, String)

#### Defined in

[packages/types/src/config.ts:333](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L333)

___

### requestTimeout

• `Optional` **requestTimeout**: `number`

Request timeout in milliseconds
Default: 200000

#### Defined in

[packages/types/src/config.ts:342](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L342)

___

### useHTTPS

• `Optional` **useHTTPS**: `boolean`

Use https instead of http for gRPC connection

#### Defined in

[packages/types/src/config.ts:347](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L347)

___

### useReflection

• `Optional` **useReflection**: `boolean`

Use gRPC reflection to automatically gather the connection

#### Defined in

[packages/types/src/config.ts:357](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/config.ts#L357)
