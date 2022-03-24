---
id: "runtime"
title: "@graphql-mesh/runtime"
sidebar_label: "runtime"
---

## Table of contents

### Interfaces

- [MeshInstance](/docs/api/interfaces/runtime_src.MeshInstance)
- [ServeMeshOptions](/docs/api/interfaces/runtime_src.ServeMeshOptions)

### Type aliases

- [ExecuteMeshFn](runtime_src#executemeshfn)
- [GetMeshOptions](runtime_src#getmeshoptions)
- [MeshContext](runtime_src#meshcontext)
- [MeshResolvedSource](runtime_src#meshresolvedsource)
- [SubscribeMeshFn](runtime_src#subscribemeshfn)

### Functions

- [getMesh](runtime_src#getmesh)

## Type aliases

### ExecuteMeshFn

Ƭ **ExecuteMeshFn**\<`TData`, `TVariables`, `TContext`, `TRootValue`>: (`document`: [`GraphQLOperation`](types_src#graphqloperation)\<`TData`, `TVariables`>, `variables`: `TVariables`, `context?`: `TContext`, `rootValue?`: `TRootValue`, `operationName?`: `string`) => `Promise`\<`TData` | ``null`` | `undefined`>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TData` | `any` |
| `TVariables` | `any` |
| `TContext` | `any` |
| `TRootValue` | `any` |

#### Type declaration

▸ (`document`, `variables`, `context?`, `rootValue?`, `operationName?`): `Promise`\<`TData` | ``null`` | `undefined`>

##### Parameters

| Name | Type |
| :------ | :------ |
| `document` | [`GraphQLOperation`](types_src#graphqloperation)\<`TData`, `TVariables`> |
| `variables` | `TVariables` |
| `context?` | `TContext` |
| `rootValue?` | `TRootValue` |
| `operationName?` | `string` |

##### Returns

`Promise`\<`TData` | ``null`` | `undefined`>

#### Defined in

[packages/runtime/src/types.ts:40](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L40)

___

### GetMeshOptions

Ƭ **GetMeshOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `additionalEnvelopPlugins?` | `Parameters`\<typeof `envelop`>[``0``][``"plugins"``] |
| `additionalResolvers?` | `IResolvers` | `IResolvers`[] |
| `additionalTypeDefs?` | `DocumentNode`[] |
| `cache` | [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache) |
| `documents?` | `Source`[] |
| `liveQueryInvalidations?` | [`LiveQueryInvalidation`](/docs/api/interfaces/types_src.YamlConfig.LiveQueryInvalidation)[] |
| `logger?` | [`Logger`](types_src#logger) |
| `merger` | [`MeshMerger`](/docs/api/interfaces/types_src.MeshMerger) |
| `pubsub` | [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub) |
| `sources` | [`MeshResolvedSource`](runtime_src#meshresolvedsource)[] |
| `transforms?` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)[] |

#### Defined in

[packages/runtime/src/types.ts:19](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L19)

___

### MeshContext

Ƭ **MeshContext**: \{ `[MESH_CONTEXT_SYMBOL]`: ``true``  } & \{ `cache`: [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache) ; `liveQueryStore`: `InMemoryLiveQueryStore` ; `logger`: [`Logger`](types_src#logger) ; `pubsub`: [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub)  }

#### Defined in

[packages/runtime/src/types.ts:56](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L56)

___

### MeshResolvedSource

Ƭ **MeshResolvedSource**\<`TContext`>: `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TContext` | `any` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `handler` | [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)\<`TContext`> |
| `merge?` | `Record`\<`string`, `MergedTypeConfig`> |
| `name` | `string` |
| `transforms?` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)[] |

#### Defined in

[packages/runtime/src/types.ts:33](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L33)

___

### SubscribeMeshFn

Ƭ **SubscribeMeshFn**\<`TVariables`, `TContext`, `TRootValue`, `TData`>: (`document`: [`GraphQLOperation`](types_src#graphqloperation)\<`TData`, `TVariables`>, `variables?`: `TVariables`, `context?`: `TContext`, `rootValue?`: `TRootValue`, `operationName?`: `string`) => `Promise`\<`TData` | ``null`` | `undefined` | `AsyncIterableIterator`\<`TData` | ``null`` | `undefined`>>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TVariables` | `any` |
| `TContext` | `any` |
| `TRootValue` | `any` |
| `TData` | `any` |

#### Type declaration

▸ (`document`, `variables?`, `context?`, `rootValue?`, `operationName?`): `Promise`\<`TData` | ``null`` | `undefined` | `AsyncIterableIterator`\<`TData` | ``null`` | `undefined`>>

##### Parameters

| Name | Type |
| :------ | :------ |
| `document` | [`GraphQLOperation`](types_src#graphqloperation)\<`TData`, `TVariables`> |
| `variables?` | `TVariables` |
| `context?` | `TContext` |
| `rootValue?` | `TRootValue` |
| `operationName?` | `string` |

##### Returns

`Promise`\<`TData` | ``null`` | `undefined` | `AsyncIterableIterator`\<`TData` | ``null`` | `undefined`>>

#### Defined in

[packages/runtime/src/types.ts:48](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L48)

## Functions

### getMesh

▸ **getMesh**\<`TMeshContext`>(`options`): `Promise`\<[`MeshInstance`](/docs/api/interfaces/runtime_src.MeshInstance)\<`TMeshContext`>>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TMeshContext` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`GetMeshOptions`](runtime_src#getmeshoptions) |

#### Returns

`Promise`\<[`MeshInstance`](/docs/api/interfaces/runtime_src.MeshInstance)\<`TMeshContext`>>

#### Defined in

[packages/runtime/src/get-mesh.ts:85](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L85)
