---
title: 'GrpcHandler'
---

# Class: GrpcHandler

[handlers/grpc/src](../modules/handlers_grpc_src).GrpcHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_grpc_src.GrpcHandler#constructor)

### Methods

- [getCachedDescriptorSets](handlers_grpc_src.GrpcHandler#getcacheddescriptorsets)
- [getCredentials](handlers_grpc_src.GrpcHandler#getcredentials)
- [getMeshSource](handlers_grpc_src.GrpcHandler#getmeshsource)
- [getRootPromiseFromDescriptorFilePath](handlers_grpc_src.GrpcHandler#getrootpromisefromdescriptorfilepath)
- [getRootPromiseFromProtoFilePath](handlers_grpc_src.GrpcHandler#getrootpromisefromprotofilepath)
- [getRootPromisesFromReflection](handlers_grpc_src.GrpcHandler#getrootpromisesfromreflection)
- [visit](handlers_grpc_src.GrpcHandler#visit)
- [walkToFindTypePath](handlers_grpc_src.GrpcHandler#walktofindtypepath)

## Constructors

### constructor

• **new GrpcHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)\<[`GrpcHandler`](/docs/api/interfaces/types_src.YamlConfig.GrpcHandler)> |

## Methods

### getCachedDescriptorSets

▸ **getCachedDescriptorSets**(`creds`): `Promise`\<`RootJsonAndDecodedDescriptorSet`[]>

#### Parameters

| Name | Type |
| :------ | :------ |
| `creds` | `ChannelCredentials` |

#### Returns

`Promise`\<`RootJsonAndDecodedDescriptorSet`[]>

___

### getCredentials

▸ **getCredentials**(): `Promise`\<`ChannelCredentials`>

#### Returns

`Promise`\<`ChannelCredentials`>

___

### getMeshSource

▸ **getMeshSource**(): `Promise`\<\{ `schema`: `GraphQLSchema`  }>

#### Returns

`Promise`\<\{ `schema`: `GraphQLSchema`  }>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

___

### getRootPromiseFromDescriptorFilePath

▸ **getRootPromiseFromDescriptorFilePath**(): `Promise`\<`Root`>

#### Returns

`Promise`\<`Root`>

___

### getRootPromiseFromProtoFilePath

▸ **getRootPromiseFromProtoFilePath**(): `Promise`\<`Root`>

#### Returns

`Promise`\<`Root`>

___

### getRootPromisesFromReflection

▸ **getRootPromisesFromReflection**(`creds`): `Promise`\<`Promise`\<`Root`>[]>

#### Parameters

| Name | Type |
| :------ | :------ |
| `creds` | `ChannelCredentials` |

#### Returns

`Promise`\<`Promise`\<`Root`>[]>

___

### visit

▸ **visit**(`__namedParameters`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.creds` | `ChannelCredentials` |
| `__namedParameters.currentPath` | `string`[] |
| `__namedParameters.grpcObject` | `GrpcObject` |
| `__namedParameters.name` | `string` |
| `__namedParameters.nested` | `AnyNestedObject` |
| `__namedParameters.rootJson` | `INamespace` |
| `__namedParameters.rootLogger` | [`Logger`](../modules/types_src#logger) |

#### Returns

`void`

___

### walkToFindTypePath

▸ **walkToFindTypePath**(`rootJson`, `pathWithName`, `baseTypePath`): `string`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `rootJson` | `INamespace` |
| `pathWithName` | `string`[] |
| `baseTypePath` | `string`[] |

#### Returns

`string`[]
