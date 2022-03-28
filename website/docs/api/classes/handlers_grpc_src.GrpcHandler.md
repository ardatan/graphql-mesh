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

#### Defined in

[packages/handlers/grpc/src/index.ts:46](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/grpc/src/index.ts#L46)

## Methods

### getCachedDescriptorSets

▸ **getCachedDescriptorSets**(`creds`): `Promise`\<`RootJsonAndDecodedDescriptorSet`[]>

#### Parameters

| Name | Type |
| :------ | :------ |
| `creds` | `ChannelCredentials` |

#### Returns

`Promise`\<`RootJsonAndDecodedDescriptorSet`[]>

#### Defined in

[packages/handlers/grpc/src/index.ts:159](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/grpc/src/index.ts#L159)

___

### getCredentials

▸ **getCredentials**(): `Promise`\<`ChannelCredentials`>

#### Returns

`Promise`\<`ChannelCredentials`>

#### Defined in

[packages/handlers/grpc/src/index.ts:197](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/grpc/src/index.ts#L197)

___

### getMeshSource

▸ **getMeshSource**(): `Promise`\<\{ `schema`: `GraphQLSchema`  }>

#### Returns

`Promise`\<\{ `schema`: `GraphQLSchema`  }>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/grpc/src/index.ts:423](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/grpc/src/index.ts#L423)

___

### getRootPromiseFromDescriptorFilePath

▸ **getRootPromiseFromDescriptorFilePath**(): `Promise`\<`Root`>

#### Returns

`Promise`\<`Root`>

#### Defined in

[packages/handlers/grpc/src/index.ts:87](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/grpc/src/index.ts#L87)

___

### getRootPromiseFromProtoFilePath

▸ **getRootPromiseFromProtoFilePath**(): `Promise`\<`Root`>

#### Returns

`Promise`\<`Root`>

#### Defined in

[packages/handlers/grpc/src/index.ts:124](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/grpc/src/index.ts#L124)

___

### getRootPromisesFromReflection

▸ **getRootPromisesFromReflection**(`creds`): `Promise`\<`Promise`\<`Root`>[]>

#### Parameters

| Name | Type |
| :------ | :------ |
| `creds` | `ChannelCredentials` |

#### Returns

`Promise`\<`Promise`\<`Root`>[]>

#### Defined in

[packages/handlers/grpc/src/index.ts:73](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/grpc/src/index.ts#L73)

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

#### Defined in

[packages/handlers/grpc/src/index.ts:238](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/grpc/src/index.ts#L238)

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

#### Defined in

[packages/handlers/grpc/src/index.ts:227](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/grpc/src/index.ts#L227)
