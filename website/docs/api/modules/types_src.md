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

### Type Aliases

- [AllHooks](types_src#allhooks)
- [GetMeshSourceOptions](types_src#getmeshsourceoptions)
- [GraphQLOperation](types_src#graphqloperation)
- [HookName](types_src#hookname)
- [ImportFn](types_src#importfn)
- [InContextSdkMethod](types_src#incontextsdkmethod)
- [InContextSdkMethodBatchingParams](types_src#incontextsdkmethodbatchingparams)
- [InContextSdkMethodCustomSelectionSetParams](types_src#incontextsdkmethodcustomselectionsetparams)
- [InContextSdkMethodInfoParams](types_src#incontextsdkmethodinfoparams)
- [InContextSdkMethodParams](types_src#incontextsdkmethodparams)
- [InContextSdkMethodRegularParams](types_src#incontextsdkmethodregularparams)
- [LazyLoggerMessage](types_src#lazyloggermessage)
- [Logger](types_src#logger)
- [Maybe](types_src#maybe)
- [MeshPluginFactory](types_src#meshpluginfactory)
- [MeshPluginOptions](types_src#meshpluginoptions)
- [MeshSource](types_src#meshsource)
- [RawSourceOutput](types_src#rawsourceoutput)
- [SelectionSetParam](types_src#selectionsetparam)
- [SelectionSetParamOrFactory](types_src#selectionsetparamorfactory)

### Variables

- [jsonSchema](types_src#jsonschema)

## Type Aliases

### AllHooks

Ƭ **AllHooks**: `Object`

#### Index signature

▪ [key: `string`]: `any`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `destroy` | `void` |

#### Defined in

[packages/types/src/index.ts:60](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L60)

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
| `fetchFn` | `FetchFn` |
| `importFn` | [`ImportFn`](types_src#importfn) |
| `logger` | [`Logger`](types_src#logger) |
| `name` | `string` |
| `pubsub` | [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub) |
| `store` | [`MeshStore`](/docs/api/classes/store_src.MeshStore) |

#### Defined in

[packages/types/src/index.ts:38](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L38)

___

### GraphQLOperation

Ƭ **GraphQLOperation**<`TData`, `TVariables`\>: `TypedDocumentNode`<`TData`, `TVariables`\> \| `string`

#### Type parameters

| Name |
| :------ |
| `TData` |
| `TVariables` |

#### Defined in

[packages/types/src/index.ts:137](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L137)

___

### HookName

Ƭ **HookName**: keyof [`AllHooks`](types_src#allhooks) & `string`

#### Defined in

[packages/types/src/index.ts:64](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L64)

___

### ImportFn

Ƭ **ImportFn**: <T\>(`moduleId`: `string`, `noCache?`: `boolean`) => `Promise`<`T`\>

#### Type declaration

▸ <`T`\>(`moduleId`, `noCache?`): `Promise`<`T`\>

##### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `any` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `moduleId` | `string` |
| `noCache?` | `boolean` |

##### Returns

`Promise`<`T`\>

#### Defined in

[packages/types/src/index.ts:139](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L139)

___

### InContextSdkMethod

Ƭ **InContextSdkMethod**<`TDefaultReturn`, `TArgs`, `TContext`\>: <TKey, TReturn\>(`params`: [`InContextSdkMethodParams`](types_src#incontextsdkmethodparams)<`TDefaultReturn`, `TArgs`, `TContext`, `TKey`, `TReturn`\>) => `Promise`<`TReturn`\>

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
| `params` | [`InContextSdkMethodParams`](types_src#incontextsdkmethodparams)<`TDefaultReturn`, `TArgs`, `TContext`, `TKey`, `TReturn`\> |

##### Returns

`Promise`<`TReturn`\>

#### Defined in

[packages/types/src/index.ts:186](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L186)

___

### InContextSdkMethodBatchingParams

Ƭ **InContextSdkMethodBatchingParams**<`TDefaultReturn`, `TArgs`, `TKey`, `TReturn`\>: `Object`

#### Type parameters

| Name |
| :------ |
| `TDefaultReturn` |
| `TArgs` |
| `TKey` |
| `TReturn` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `argsFromKeys` | (`keys`: `TKey`[]) => `TArgs` |
| `key` | `TKey` |
| `valuesFromResults?` | (`results`: `TDefaultReturn`, `keys`: `TKey`[]) => `TReturn` \| `TReturn`[] |

#### Defined in

[packages/types/src/index.ts:156](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L156)

___

### InContextSdkMethodCustomSelectionSetParams

Ƭ **InContextSdkMethodCustomSelectionSetParams**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `info?` | `GraphQLResolveInfo` |
| `selectionSet` | [`SelectionSetParamOrFactory`](types_src#selectionsetparamorfactory) |

#### Defined in

[packages/types/src/index.ts:167](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L167)

___

### InContextSdkMethodInfoParams

Ƭ **InContextSdkMethodInfoParams**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `info` | `GraphQLResolveInfo` |

#### Defined in

[packages/types/src/index.ts:173](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L173)

___

### InContextSdkMethodParams

Ƭ **InContextSdkMethodParams**<`TDefaultReturn`, `TArgs`, `TContext`, `TKey`, `TReturn`\>: { `context`: `TContext` ; `root?`: `any`  } & [`InContextSdkMethodCustomSelectionSetParams`](types_src#incontextsdkmethodcustomselectionsetparams) \| [`InContextSdkMethodInfoParams`](types_src#incontextsdkmethodinfoparams) & [`InContextSdkMethodBatchingParams`](types_src#incontextsdkmethodbatchingparams)<`TDefaultReturn`, `TArgs`, `TKey`, `TReturn`\> \| [`InContextSdkMethodRegularParams`](types_src#incontextsdkmethodregularparams)<`TDefaultReturn`, `TArgs`, `TReturn`\>

#### Type parameters

| Name |
| :------ |
| `TDefaultReturn` |
| `TArgs` |
| `TContext` |
| `TKey` |
| `TReturn` |

#### Defined in

[packages/types/src/index.ts:177](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L177)

___

### InContextSdkMethodRegularParams

Ƭ **InContextSdkMethodRegularParams**<`TDefaultReturn`, `TArgs`, `TReturn`\>: `Object`

#### Type parameters

| Name |
| :------ |
| `TDefaultReturn` |
| `TArgs` |
| `TReturn` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `args?` | `TArgs` |
| `valuesFromResults?` | (`results`: `TDefaultReturn`) => `TReturn` \| `TReturn`[] |

#### Defined in

[packages/types/src/index.ts:162](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L162)

___

### LazyLoggerMessage

Ƭ **LazyLoggerMessage**: () => `any` \| `any`[] \| `any`

#### Defined in

[packages/types/src/index.ts:141](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L141)

___

### Logger

Ƭ **Logger**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `child` | (`name`: `string`) => [`Logger`](types_src#logger) |
| `debug` | (...`lazyArgs`: [`LazyLoggerMessage`](types_src#lazyloggermessage)[]) => `void` |
| `error` | (...`args`: `any`[]) => `void` |
| `info` | (...`args`: `any`[]) => `void` |
| `log` | (...`args`: `any`[]) => `void` |
| `name?` | `string` |
| `warn` | (...`args`: `any`[]) => `void` |

#### Defined in

[packages/types/src/index.ts:143](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L143)

___

### Maybe

Ƭ **Maybe**<`T`\>: ``null`` \| `undefined` \| `T`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/types/src/index.ts:94](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L94)

___

### MeshPluginFactory

Ƭ **MeshPluginFactory**<`TConfig`\>: (`options`: [`MeshPluginOptions`](types_src#meshpluginoptions)<`TConfig`\>) => `Plugin`

#### Type parameters

| Name |
| :------ |
| `TConfig` |

#### Type declaration

▸ (`options`): `Plugin`

##### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`MeshPluginOptions`](types_src#meshpluginoptions)<`TConfig`\> |

##### Returns

`Plugin`

#### Defined in

[packages/types/src/index.ts:124](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L124)

___

### MeshPluginOptions

Ƭ **MeshPluginOptions**<`TConfig`\>: `TConfig` & { `cache`: [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache) ; `logger`: [`Logger`](types_src#logger) ; `pubsub`: [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub)  }

#### Type parameters

| Name |
| :------ |
| `TConfig` |

#### Defined in

[packages/types/src/index.ts:118](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L118)

___

### MeshSource

Ƭ **MeshSource**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `batch?` | `boolean` |
| `contextVariables?` | `Record`<`string`, `string`\> |
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
| `contextVariables` | `Record`<`string`, `string`\> |
| `executor?` | `Executor` |
| `handler` | [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler) |
| `merge?` | `Record`<`string`, `MergedTypeConfig`\> |
| `name` | `string` |
| `schema` | `GraphQLSchema` |
| `transforms` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)[] |

#### Defined in

[packages/types/src/index.ts:126](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L126)

___

### SelectionSetParam

Ƭ **SelectionSetParam**: `SelectionSetNode` \| `DocumentNode` \| `string` \| `SelectionSetNode`

#### Defined in

[packages/types/src/index.ts:153](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L153)

___

### SelectionSetParamOrFactory

Ƭ **SelectionSetParamOrFactory**: (`subtree`: `SelectionSetNode`) => [`SelectionSetParam`](types_src#selectionsetparam) \| [`SelectionSetParam`](types_src#selectionsetparam)

#### Defined in

[packages/types/src/index.ts:154](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L154)

## Variables

### jsonSchema

• `Const` **jsonSchema**: `any` = `configSchema`

#### Defined in

[packages/types/src/index.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L11)
