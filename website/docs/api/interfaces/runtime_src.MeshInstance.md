---
title: 'MeshInstance'
---

# Interface: MeshInstance<TMeshContext\>

[runtime/src](../modules/runtime_src).MeshInstance

## Type parameters

| Name | Type |
| :------ | :------ |
| `TMeshContext` | `any` |

## Table of contents

### Properties

- [cache](runtime_src.MeshInstance#cache)
- [execute](runtime_src.MeshInstance#execute)
- [getEnveloped](runtime_src.MeshInstance#getenveloped)
- [logger](runtime_src.MeshInstance#logger)
- [meshContext](runtime_src.MeshInstance#meshcontext)
- [plugins](runtime_src.MeshInstance#plugins)
- [pubsub](runtime_src.MeshInstance#pubsub)
- [rawSources](runtime_src.MeshInstance#rawsources)
- [schema](runtime_src.MeshInstance#schema)
- [subscribe](runtime_src.MeshInstance#subscribe)

### Methods

- [destroy](runtime_src.MeshInstance#destroy)
- [sdkRequesterFactory](runtime_src.MeshInstance#sdkrequesterfactory)

## Properties

### cache

• **cache**: [`KeyValueCache`](types_src.KeyValueCache)<`any`\>

#### Defined in

[packages/runtime/src/get-mesh.ts:67](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L67)

___

### execute

• **execute**: [`ExecuteMeshFn`](../modules/runtime_src#executemeshfn)<`any`, `any`, `any`, `any`\>

#### Defined in

[packages/runtime/src/get-mesh.ts:61](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L61)

___

### getEnveloped

• **getEnveloped**: `GetEnvelopedFn`<{}\>

#### Defined in

[packages/runtime/src/get-mesh.ts:71](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L71)

___

### logger

• **logger**: [`Logger`](../modules/types_src#logger)

#### Defined in

[packages/runtime/src/get-mesh.ts:68](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L68)

___

### meshContext

• **meshContext**: `TMeshContext`

#### Defined in

[packages/runtime/src/get-mesh.ts:69](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L69)

___

### plugins

• **plugins**: `PluginOrDisabledPlugin`[]

#### Defined in

[packages/runtime/src/get-mesh.ts:70](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L70)

___

### pubsub

• **pubsub**: [`MeshPubSub`](types_src.MeshPubSub)

#### Defined in

[packages/runtime/src/get-mesh.ts:66](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L66)

___

### rawSources

• **rawSources**: [`RawSourceOutput`](../modules/types_src#rawsourceoutput)[]

#### Defined in

[packages/runtime/src/get-mesh.ts:64](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L64)

___

### schema

• **schema**: `GraphQLSchema`

#### Defined in

[packages/runtime/src/get-mesh.ts:63](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L63)

___

### subscribe

• **subscribe**: [`SubscribeMeshFn`](../modules/runtime_src#subscribemeshfn)<`any`, `any`, `any`, `any`\>

#### Defined in

[packages/runtime/src/get-mesh.ts:62](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L62)

## Methods

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Defined in

[packages/runtime/src/get-mesh.ts:65](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L65)

___

### sdkRequesterFactory

▸ **sdkRequesterFactory**(`globalContext`): (`document`: `DocumentNode`, `variables?`: `any`, `operationContext?`: `any`) => `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `globalContext` | `any` |

#### Returns

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

[packages/runtime/src/get-mesh.ts:72](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L72)
