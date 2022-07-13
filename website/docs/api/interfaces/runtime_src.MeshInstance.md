---
title: 'MeshInstance'
---

# Interface: MeshInstance

[runtime/src](../modules/runtime_src).MeshInstance

## Table of contents

### Properties

- [cache](runtime_src.MeshInstance#cache)
- [execute](runtime_src.MeshInstance#execute)
- [getEnveloped](runtime_src.MeshInstance#getenveloped)
- [logger](runtime_src.MeshInstance#logger)
- [plugins](runtime_src.MeshInstance#plugins)
- [pubsub](runtime_src.MeshInstance#pubsub)
- [rawSources](runtime_src.MeshInstance#rawsources)
- [schema](runtime_src.MeshInstance#schema)
- [sdkRequesterFactory](runtime_src.MeshInstance#sdkrequesterfactory)
- [subscribe](runtime_src.MeshInstance#subscribe)

### Methods

- [destroy](runtime_src.MeshInstance#destroy)

## Properties

### cache

• **cache**: [`KeyValueCache`](types_src.KeyValueCache)\<`any`>

#### Defined in

[packages/runtime/src/get-mesh.ts:36](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L36)

___

### execute

• **execute**: [`ExecuteMeshFn`](../modules/runtime_src#executemeshfn)\<`any`, `any`, `any`, `any`>

#### Defined in

[packages/runtime/src/get-mesh.ts:30](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L30)

___

### getEnveloped

• **getEnveloped**: `GetEnvelopedFn`\<\{}>

#### Defined in

[packages/runtime/src/get-mesh.ts:39](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L39)

___

### logger

• **logger**: [`Logger`](../modules/types_src#logger)

#### Defined in

[packages/runtime/src/get-mesh.ts:37](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L37)

___

### plugins

• **plugins**: `PluginOrDisabledPlugin`[]

#### Defined in

[packages/runtime/src/get-mesh.ts:38](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L38)

___

### pubsub

• **pubsub**: [`MeshPubSub`](types_src.MeshPubSub)

#### Defined in

[packages/runtime/src/get-mesh.ts:35](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L35)

___

### rawSources

• **rawSources**: [`RawSourceOutput`](../modules/types_src#rawsourceoutput)[]

#### Defined in

[packages/runtime/src/get-mesh.ts:33](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L33)

___

### schema

• **schema**: `GraphQLSchema`

#### Defined in

[packages/runtime/src/get-mesh.ts:32](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L32)

___

### sdkRequesterFactory

• **sdkRequesterFactory**: (`globalContext`: `any`) => (`document`: `DocumentNode`, `variables?`: `any`, `operationContext?`: `any`) => `any`

#### Type declaration

▸ (`globalContext`): (`document`: `DocumentNode`, `variables?`: `any`, `operationContext?`: `any`) => `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `globalContext` | `any` |

##### Returns

`fn`

▸ (`document`, `variables?`, `operationContext?`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `document` | `DocumentNode` |
| `variables?` | `any` |
| `operationContext?` | `any` |

##### Returns

`any`

#### Defined in

[packages/runtime/src/get-mesh.ts:40](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L40)

___

### subscribe

• **subscribe**: [`SubscribeMeshFn`](../modules/runtime_src#subscribemeshfn)\<`any`, `any`, `any`, `any`>

#### Defined in

[packages/runtime/src/get-mesh.ts:31](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L31)

## Methods

### destroy

▸ **destroy**(): `void`

#### Returns

`void`
