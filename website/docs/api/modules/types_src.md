---
id: "types"
title: "@graphql-mesh/types"
sidebar_label: "types"
---

## Table of contents

### Namespaces

- [YamlConfig](types_src.YamlConfig)

### Interfaces

- [KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache)
- [KeyValueCacheSetOptions](/docs/api/interfaces/types_src.KeyValueCacheSetOptions)
- [MeshHandler](/docs/api/interfaces/types_src.MeshHandler)
- [MeshHandlerLibrary](/docs/api/interfaces/types_src.MeshHandlerLibrary)
- [MeshMerger](/docs/api/interfaces/types_src.MeshMerger)
- [MeshMergerContext](/docs/api/interfaces/types_src.MeshMergerContext)
- [MeshMergerLibrary](/docs/api/interfaces/types_src.MeshMergerLibrary)
- [MeshMergerOptions](/docs/api/interfaces/types_src.MeshMergerOptions)
- [MeshPubSub](/docs/api/interfaces/types_src.MeshPubSub)
- [MeshTransform](/docs/api/interfaces/types_src.MeshTransform)
- [MeshTransformLibrary](/docs/api/interfaces/types_src.MeshTransformLibrary)
- [MeshTransformOptions](/docs/api/interfaces/types_src.MeshTransformOptions)

### Type aliases

- [AllHooks](types_src#allhooks)
- [GetMeshSourceOptions](types_src#getmeshsourceoptions)
- [GraphQLOperation](types_src#graphqloperation)
- [HookName](types_src#hookname)
- [ImportFn](types_src#importfn)
- [InContextSdkMethod](types_src#incontextsdkmethod)
- [LazyLoggerMessage](types_src#lazyloggermessage)
- [Logger](types_src#logger)
- [Maybe](types_src#maybe)
- [MeshSource](types_src#meshsource)
- [RawSourceOutput](types_src#rawsourceoutput)
- [ResolverData](types_src#resolverdata)
- [SelectionSetParam](types_src#selectionsetparam)
- [SelectionSetParamOrFactory](types_src#selectionsetparamorfactory)

### Variables

- [jsonSchema](types_src#jsonschema)

## Type aliases

### AllHooks

Ƭ **AllHooks**: `Object`

#### Index signature

▪ [key: `string`]: `any`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `destroy` | `void` |
| `resolverCalled` | `Object` |
| `resolverCalled.resolverData` | [`ResolverData`](types_src#resolverdata) |
| `resolverDone` | `Object` |
| `resolverDone.resolverData` | [`ResolverData`](types_src#resolverdata) |
| `resolverDone.result` | `any` |
| `resolverError` | `Object` |
| `resolverError.error` | `Error` |
| `resolverError.resolverData` | [`ResolverData`](types_src#resolverdata) |

#### Defined in

[packages/types/src/index.ts:52](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L52)

___

### GetMeshSourceOptions

Ƭ **GetMeshSourceOptions**<`THandlerConfig`\>: `Object`

#### Type parameters

| Name |
| :------ |
| `THandlerConfig` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `baseDir` | `string` |
| `cache` | [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache) |
| `config` | `THandlerConfig` |
| `importFn` | [`ImportFn`](types_src#importfn) |
| `logger` | [`Logger`](types_src#logger) |
| `name` | `string` |
| `pubsub` | [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub) |
| `store` | [`MeshStore`](/docs/api/classes/store_src.MeshStore) |

#### Defined in

[packages/types/src/index.ts:22](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L22)

___

### GraphQLOperation

Ƭ **GraphQLOperation**<`TData`, `TVariables`\>: `TypedDocumentNode`<`TData`, `TVariables`\> \| `string`

#### Type parameters

| Name |
| :------ |
| `TData` |
| `TVariables` |

#### Defined in

[packages/types/src/index.ts:127](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L127)

___

### HookName

Ƭ **HookName**: keyof [`AllHooks`](types_src#allhooks) & `string`

#### Defined in

[packages/types/src/index.ts:59](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L59)

___

### ImportFn

Ƭ **ImportFn**: <T\>(`moduleId`: `string`) => `Promise`<`T`\>

#### Type declaration

▸ <`T`\>(`moduleId`): `Promise`<`T`\>

##### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `any` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `moduleId` | `string` |

##### Returns

`Promise`<`T`\>

#### Defined in

[packages/types/src/index.ts:129](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L129)

___

### InContextSdkMethod

Ƭ **InContextSdkMethod**<`TDefaultReturn`, `TArgs`, `TContext`\>: <TKey, TReturn\>(`params`: { `args?`: `TArgs` ; `context?`: `TContext` ; `info?`: `GraphQLResolveInfo` ; `key?`: `TKey` ; `root?`: `any` ; `selectionSet?`: [`SelectionSetParamOrFactory`](types_src#selectionsetparamorfactory) ; `argsFromKeys?`: (`keys`: `TKey`[]) => `TArgs` ; `valuesFromResults?`: (`results`: `TDefaultReturn`, `keys`: `TKey`[]) => `TReturn` \| `TReturn`[]  }) => `Promise`<`TReturn`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TDefaultReturn` | `any` |
| `TArgs` | `any` |
| `TContext` | `any` |

#### Type declaration

▸ <`TKey`, `TReturn`\>(`params`): `Promise`<`TReturn`\>

##### Type parameters

| Name | Type |
| :------ | :------ |
| `TKey` | `TKey` |
| `TReturn` | `TDefaultReturn` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.args?` | `TArgs` |
| `params.context?` | `TContext` |
| `params.info?` | `GraphQLResolveInfo` |
| `params.key?` | `TKey` |
| `params.root?` | `any` |
| `params.selectionSet?` | [`SelectionSetParamOrFactory`](types_src#selectionsetparamorfactory) |
| `params.argsFromKeys?` | (`keys`: `TKey`[]) => `TArgs` |
| `params.valuesFromResults?` | (`results`: `TDefaultReturn`, `keys`: `TKey`[]) => `TReturn` \| `TReturn`[] |

##### Returns

`Promise`<`TReturn`\>

#### Defined in

[packages/types/src/index.ts:146](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L146)

___

### LazyLoggerMessage

Ƭ **LazyLoggerMessage**: () => `string` \| `string`

#### Defined in

[packages/types/src/index.ts:131](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L131)

___

### Logger

Ƭ **Logger**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `name?` | `string` |
| `child` | (`name`: `string`) => [`Logger`](types_src#logger) |
| `debug` | (`message`: [`LazyLoggerMessage`](types_src#lazyloggermessage)) => `void` |
| `error` | (`message`: `string`) => `void` |
| `info` | (`message`: `string`) => `void` |
| `log` | (`message`: `string`) => `void` |
| `warn` | (`message`: `string`) => `void` |

#### Defined in

[packages/types/src/index.ts:133](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L133)

___

### Maybe

Ƭ **Maybe**<`T`\>: ``null`` \| `undefined` \| `T`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/types/src/index.ts:89](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L89)

___

### MeshSource

Ƭ **MeshSource**<`ContextType`, `InitialContext`\>: `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `ContextType` | `any` |
| `InitialContext` | `any` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `batch?` | `boolean` |
| `contextVariables?` | keyof `InitialContext`[] |
| `executor?` | `Executor` |
| `schema` | `GraphQLSchema` |

#### Defined in

[packages/types/src/index.ts:15](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L15)

___

### RawSourceOutput

Ƭ **RawSourceOutput**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `batch` | `boolean` |
| `contextVariables` | keyof `any`[] |
| `executor?` | `Executor` |
| `handler` | [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler) |
| `merge?` | `Record`<`string`, `MergedTypeConfig`\> |
| `name` | `string` |
| `schema` | `GraphQLSchema` |
| `transforms` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)[] |

#### Defined in

[packages/types/src/index.ts:116](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L116)

___

### ResolverData

Ƭ **ResolverData**<`TParent`, `TArgs`, `TContext`, `TResult`\>: `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TParent` | `any` |
| `TArgs` | `any` |
| `TContext` | `any` |
| `TResult` | `any` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `args?` | `TArgs` |
| `context?` | `TContext` |
| `env` | `Record`<`string`, `string`\> |
| `info?` | `GraphQLResolveInfo` |
| `result?` | `TResult` |
| `root?` | `TParent` |

#### Defined in

[packages/types/src/index.ts:42](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L42)

___

### SelectionSetParam

Ƭ **SelectionSetParam**: `SelectionSetNode` \| `DocumentNode` \| `string` \| `SelectionSetNode`

#### Defined in

[packages/types/src/index.ts:143](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L143)

___

### SelectionSetParamOrFactory

Ƭ **SelectionSetParamOrFactory**: (`subtree`: `SelectionSetNode`) => [`SelectionSetParam`](types_src#selectionsetparam) \| [`SelectionSetParam`](types_src#selectionsetparam)

#### Defined in

[packages/types/src/index.ts:144](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L144)

## Variables

### jsonSchema

• **jsonSchema**: `any` = `configSchema`

#### Defined in

[packages/types/src/index.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L11)
