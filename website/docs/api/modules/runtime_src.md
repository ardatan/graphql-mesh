---
id: "runtime"
title: "@graphql-mesh/runtime"
sidebar_label: "runtime"
---

## Table of contents

### Interfaces

- [MeshInstance](/docs/api/interfaces/runtime_src.MeshInstance)

### Type aliases

- [APIContext](runtime_src#apicontext)
- [APIContextMethodParams](runtime_src#apicontextmethodparams)
- [ExecuteMeshFn](runtime_src#executemeshfn)
- [GetMeshOptions](runtime_src#getmeshoptions)
- [MeshContext](runtime_src#meshcontext)
- [MeshResolvedSource](runtime_src#meshresolvedsource)
- [Requester](runtime_src#requester)
- [SubscribeMeshFn](runtime_src#subscribemeshfn)

### Functions

- [applyResolversHooksToResolvers](runtime_src#applyresolvershookstoresolvers)
- [applyResolversHooksToSchema](runtime_src#applyresolvershookstoschema)
- [getMesh](runtime_src#getmesh)

## Type aliases

### APIContext

Ƭ **APIContext**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `Mutation` | `Record`<`string`, `fn`\> |
| `Query` | `Record`<`string`, `fn`\> |
| `Subscription` | `Record`<`string`, `fn`\> |
| `rawSource` | [`RawSourceOutput`](types_src#rawsourceoutput) |

#### Defined in

[packages/runtime/src/types.ts:62](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L62)

___

### APIContextMethodParams

Ƭ **APIContextMethodParams**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `args?` | `any` |
| `context` | `any` |
| `info?` | `GraphQLResolveInfo` |
| `root?` | `any` |
| `selectionSet?` | `string` |

#### Defined in

[packages/runtime/src/types.ts:54](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L54)

___

### ExecuteMeshFn

Ƭ **ExecuteMeshFn**<`TData`, `TVariables`, `TContext`, `TRootValue`\>: (`document`: [`GraphQLOperation`](types_src#graphqloperation)<`TData`, `TVariables`\>, `variables`: `TVariables`, `context?`: `TContext`, `rootValue?`: `TRootValue`, `operationName?`: `string`) => `Promise`<`TData` \| ``null`` \| `undefined`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TData` | `any` |
| `TVariables` | `any` |
| `TContext` | `any` |
| `TRootValue` | `any` |

#### Type declaration

▸ (`document`, `variables`, `context?`, `rootValue?`, `operationName?`): `Promise`<`TData` \| ``null`` \| `undefined`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `document` | [`GraphQLOperation`](types_src#graphqloperation)<`TData`, `TVariables`\> |
| `variables` | `TVariables` |
| `context?` | `TContext` |
| `rootValue?` | `TRootValue` |
| `operationName?` | `string` |

##### Returns

`Promise`<`TData` \| ``null`` \| `undefined`\>

#### Defined in

[packages/runtime/src/types.ts:36](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L36)

___

### GetMeshOptions

Ƭ **GetMeshOptions**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `additionalResolvers?` | `IResolvers` \| `IResolvers`[] |
| `additionalTypeDefs?` | `DocumentNode`[] |
| `cache` | [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache) |
| `liveQueryInvalidations?` | [`LiveQueryInvalidation`](/docs/api/interfaces/types_src.YamlConfig.LiveQueryInvalidation)[] |
| `logger?` | [`Logger`](types_src#logger) |
| `merger` | [`MeshMerger`](/docs/api/interfaces/types_src.MeshMerger) |
| `pubsub` | [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub) |
| `sources` | [`MeshResolvedSource`](runtime_src#meshresolvedsource)[] |
| `transforms?` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)[] |

#### Defined in

[packages/runtime/src/types.ts:17](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L17)

___

### MeshContext

Ƭ **MeshContext**: { [key: string]: [`APIContext`](runtime_src#apicontext); `[MESH_CONTEXT_SYMBOL]`: ``true``  } & { `cache`: [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache) ; `pubsub`: [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub)  }

#### Defined in

[packages/runtime/src/types.ts:69](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L69)

___

### MeshResolvedSource

Ƭ **MeshResolvedSource**<`TContext`\>: `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TContext` | `any` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `handler` | [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)<`TContext`\> |
| `merge?` | `Record`<`string`, `MergedTypeConfig`\> |
| `name` | `string` |
| `transforms?` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)[] |

#### Defined in

[packages/runtime/src/types.ts:29](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L29)

___

### Requester

Ƭ **Requester**<`C`\>: <R, V\>(`doc`: `DocumentNode`, `vars?`: `V`, `options?`: `C`) => `Promise`<`R`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `C` | `any` |

#### Type declaration

▸ <`R`, `V`\>(`doc`, `vars?`, `options?`): `Promise`<`R`\>

##### Type parameters

| Name |
| :------ |
| `R` |
| `V` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `doc` | `DocumentNode` |
| `vars?` | `V` |
| `options?` | `C` |

##### Returns

`Promise`<`R`\>

#### Defined in

[packages/runtime/src/types.ts:52](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L52)

___

### SubscribeMeshFn

Ƭ **SubscribeMeshFn**<`TVariables`, `TContext`, `TRootValue`, `TData`\>: (`document`: [`GraphQLOperation`](types_src#graphqloperation)<`TData`, `TVariables`\>, `variables?`: `TVariables`, `context?`: `TContext`, `rootValue?`: `TRootValue`, `operationName?`: `string`) => `Promise`<`TData` \| ``null`` \| `undefined` \| `AsyncIterableIterator`<`TData` \| ``null`` \| `undefined`\>\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TVariables` | `any` |
| `TContext` | `any` |
| `TRootValue` | `any` |
| `TData` | `any` |

#### Type declaration

▸ (`document`, `variables?`, `context?`, `rootValue?`, `operationName?`): `Promise`<`TData` \| ``null`` \| `undefined` \| `AsyncIterableIterator`<`TData` \| ``null`` \| `undefined`\>\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `document` | [`GraphQLOperation`](types_src#graphqloperation)<`TData`, `TVariables`\> |
| `variables?` | `TVariables` |
| `context?` | `TContext` |
| `rootValue?` | `TRootValue` |
| `operationName?` | `string` |

##### Returns

`Promise`<`TData` \| ``null`` \| `undefined` \| `AsyncIterableIterator`<`TData` \| ``null`` \| `undefined`\>\>

#### Defined in

[packages/runtime/src/types.ts:44](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/types.ts#L44)

## Functions

### applyResolversHooksToResolvers

▸ **applyResolversHooksToResolvers**(`resolvers`, `pubsub`, `meshContext`): `IResolvers`

#### Parameters

| Name | Type |
| :------ | :------ |
| `resolvers` | `IResolvers`<`any`, `any`, `Record`<`string`, `any`\>, `any`\> |
| `pubsub` | [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub) |
| `meshContext` | `any` |

#### Returns

`IResolvers`

#### Defined in

[packages/runtime/src/resolvers-hooks.ts:9](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/resolvers-hooks.ts#L9)

___

### applyResolversHooksToSchema

▸ **applyResolversHooksToSchema**(`schema`, `pubsub`, `meshContext`): `GraphQLSchema`

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | `GraphQLSchema` |
| `pubsub` | [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub) |
| `meshContext` | `any` |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/runtime/src/resolvers-hooks.ts:63](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/resolvers-hooks.ts#L63)

___

### getMesh

▸ **getMesh**(`options`): `Promise`<[`MeshInstance`](/docs/api/interfaces/runtime_src.MeshInstance)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`GetMeshOptions`](runtime_src#getmeshoptions) |

#### Returns

`Promise`<[`MeshInstance`](/docs/api/interfaces/runtime_src.MeshInstance)\>

#### Defined in

[packages/runtime/src/get-mesh.ts:63](https://github.com/Urigo/graphql-mesh/blob/master/packages/runtime/src/get-mesh.ts#L63)
