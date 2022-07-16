---
id: "runtime"
title: "@graphql-mesh/runtime"
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
- [useSubschema](runtime_src#usesubschema)

## Type aliases

### ExecuteMeshFn

Ƭ **ExecuteMeshFn**\<`TData`, `TVariables`, `TContext`, `TRootValue`>: (`document`: [`GraphQLOperation`](types_src#graphqloperation)\<`TData`, `TVariables`>, `variables`: `TVariables`, `context?`: `TContext`, `rootValue?`: `TRootValue`, `operationName?`: `string`) => `Promise`\<`ExecutionResult`\<`TData`>>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TData` | `any` |
| `TVariables` | `any` |
| `TContext` | `any` |
| `TRootValue` | `any` |

#### Type declaration

▸ (`document`, `variables`, `context?`, `rootValue?`, `operationName?`): `Promise`\<`ExecutionResult`\<`TData`>>

##### Parameters

| Name | Type |
| :------ | :------ |
| `document` | [`GraphQLOperation`](types_src#graphqloperation)\<`TData`, `TVariables`> |
| `variables` | `TVariables` |
| `context?` | `TContext` |
| `rootValue?` | `TRootValue` |
| `operationName?` | `string` |

##### Returns

`Promise`\<`ExecutionResult`\<`TData`>>

#### Defined in

[packages/runtime/src/types.ts:38](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L38)

___

### GetMeshOptions

Ƭ **GetMeshOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `additionalEnvelopPlugins?` | `Parameters`\<typeof `envelop`>[``0``][``"plugins"``] |
| `additionalResolvers?` | `IResolvers` \| `IResolvers`[] |
| `additionalTypeDefs?` | `DocumentNode`[] |
| `cache` | [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache) |
| `documents?` | `Source`[] |
| `logger?` | [`Logger`](types_src#logger) |
| `merger` | [`MeshMerger`](/docs/api/interfaces/types_src.MeshMerger) |
| `pubsub?` | [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub) |
| `sources` | [`MeshResolvedSource`](runtime_src#meshresolvedsource)[] |
| `transforms?` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)[] |

#### Defined in

[packages/runtime/src/types.ts:18](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L18)

___

### MeshContext

Ƭ **MeshContext**: \{ `[MESH_CONTEXT_SYMBOL]`: ``true``  } & \{ `cache`: [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache) ; `logger`: [`Logger`](types_src#logger) ; `pubsub`: [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub)  }

#### Defined in

[packages/runtime/src/types.ts:54](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L54)

___

### MeshResolvedSource

Ƭ **MeshResolvedSource**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `handler` | [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler) |
| `merge?` | `Record`\<`string`, `MergedTypeConfig`> |
| `name` | `string` |
| `transforms?` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)[] |

#### Defined in

[packages/runtime/src/types.ts:31](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L31)

___

### SubscribeMeshFn

Ƭ **SubscribeMeshFn**\<`TVariables`, `TContext`, `TRootValue`, `TData`>: (`document`: [`GraphQLOperation`](types_src#graphqloperation)\<`TData`, `TVariables`>, `variables?`: `TVariables`, `context?`: `TContext`, `rootValue?`: `TRootValue`, `operationName?`: `string`) => `Promise`\<`ExecutionResult`\<`TData`> \| `AsyncIterable`\<`ExecutionResult`\<`TData`>>>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TVariables` | `any` |
| `TContext` | `any` |
| `TRootValue` | `any` |
| `TData` | `any` |

#### Type declaration

▸ (`document`, `variables?`, `context?`, `rootValue?`, `operationName?`): `Promise`\<`ExecutionResult`\<`TData`> \| `AsyncIterable`\<`ExecutionResult`\<`TData`>>>

##### Parameters

| Name | Type |
| :------ | :------ |
| `document` | [`GraphQLOperation`](types_src#graphqloperation)\<`TData`, `TVariables`> |
| `variables?` | `TVariables` |
| `context?` | `TContext` |
| `rootValue?` | `TRootValue` |
| `operationName?` | `string` |

##### Returns

`Promise`\<`ExecutionResult`\<`TData`> \| `AsyncIterable`\<`ExecutionResult`\<`TData`>>>

#### Defined in

[packages/runtime/src/types.ts:46](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L46)

## Functions

### getMesh

▸ **getMesh**(`options`): `Promise`\<[`MeshInstance`](/docs/api/interfaces/runtime_src.MeshInstance)>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`GetMeshOptions`](runtime_src#getmeshoptions) |

#### Returns

`Promise`\<[`MeshInstance`](/docs/api/interfaces/runtime_src.MeshInstance)>

#### Defined in

[packages/runtime/src/get-mesh.ts:58](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L58)

___

### useSubschema

▸ **useSubschema**(`subschema`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `subschema` | `SubschemaConfig`\<`any`, `any`, `any`, `Record`\<`string`, `any`>> |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `plugin` | `Plugin` |
| `transformedSchema` | `GraphQLSchema` |

#### Defined in

[packages/runtime/src/useSubschema.ts:55](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/useSubschema.ts#L55)
