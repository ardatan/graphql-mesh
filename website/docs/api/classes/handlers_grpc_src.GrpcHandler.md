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

- [getCachedDescriptorSet](handlers_grpc_src.GrpcHandler#getcacheddescriptorset)
- [getMeshSource](handlers_grpc_src.GrpcHandler#getmeshsource)

## Constructors

### constructor

• **new GrpcHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)<[`GrpcHandler`](/docs/api/interfaces/types_src.YamlConfig.GrpcHandler)\> |

#### Defined in

[packages/handlers/grpc/src/index.ts:47](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/grpc/src/index.ts#L47)

## Methods

### getCachedDescriptorSet

▸ **getCachedDescriptorSet**(`creds`): `Promise`<`RootJsonAndDecodedDescriptorSet`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `creds` | `ChannelCredentials` |

#### Returns

`Promise`<`RootJsonAndDecodedDescriptorSet`\>

#### Defined in

[packages/handlers/grpc/src/index.ts:65](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/grpc/src/index.ts#L65)

___

### getMeshSource

▸ **getMeshSource**(): `Promise`<`Object`\>

#### Returns

`Promise`<`Object`\>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/grpc/src/index.ts:181](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/grpc/src/index.ts#L181)
