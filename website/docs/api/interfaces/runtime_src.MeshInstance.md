---
title: 'MeshInstance'
---

# Interface: MeshInstance

[runtime/src](../modules/runtime_src).MeshInstance

## Table of contents

### Properties

- [cache](runtime_src.MeshInstance#cache)
- [execute](runtime_src.MeshInstance#execute)
- [liveQueryStore](runtime_src.MeshInstance#livequerystore)
- [pubsub](runtime_src.MeshInstance#pubsub)
- [rawSources](runtime_src.MeshInstance#rawsources)
- [schema](runtime_src.MeshInstance#schema)
- [sdkRequester](runtime_src.MeshInstance#sdkrequester)
- [subscribe](runtime_src.MeshInstance#subscribe)

### Methods

- [contextBuilder](runtime_src.MeshInstance#contextbuilder)
- [destroy](runtime_src.MeshInstance#destroy)

## Properties

### cache

• **cache**: [`KeyValueCache`](types_src.KeyValueCache)<`any`\>

#### Defined in

[packages/runtime/src/get-mesh.ts:53](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L53)

___

### execute

• **execute**: [`ExecuteMeshFn`](../modules/runtime_src#executemeshfn)<`any`, `any`, `any`, `any`\>

#### Defined in

[packages/runtime/src/get-mesh.ts:46](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L46)

___

### liveQueryStore

• **liveQueryStore**: `InMemoryLiveQueryStore`

#### Defined in

[packages/runtime/src/get-mesh.ts:54](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L54)

___

### pubsub

• **pubsub**: [`MeshPubSub`](types_src.MeshPubSub)

#### Defined in

[packages/runtime/src/get-mesh.ts:52](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L52)

___

### rawSources

• **rawSources**: [`RawSourceOutput`](../modules/types_src#rawsourceoutput)[]

#### Defined in

[packages/runtime/src/get-mesh.ts:49](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L49)

___

### schema

• **schema**: `GraphQLSchema`

#### Defined in

[packages/runtime/src/get-mesh.ts:48](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L48)

___

### sdkRequester

• **sdkRequester**: [`Requester`](../modules/runtime_src#requester)<`any`\>

#### Defined in

[packages/runtime/src/get-mesh.ts:50](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L50)

___

### subscribe

• **subscribe**: [`SubscribeMeshFn`](../modules/runtime_src#subscribemeshfn)<`any`, `any`, `any`, `any`\>

#### Defined in

[packages/runtime/src/get-mesh.ts:47](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L47)

## Methods

### contextBuilder

▸ **contextBuilder**(`ctx`): `Promise`<`any`\>

**`deprecated`**
contextBuilder has no effect in the provided context anymore.
It will be removed in the next version

#### Parameters

| Name | Type |
| :------ | :------ |
| `ctx` | `any` |

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/runtime/src/get-mesh.ts:60](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L60)

___

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Defined in

[packages/runtime/src/get-mesh.ts:51](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L51)
