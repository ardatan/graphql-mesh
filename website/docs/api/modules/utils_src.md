---
id: "utils"
title: "@graphql-mesh/utils"
sidebar_label: "utils"
---

## Table of contents

### Classes

- [DefaultLogger](/docs/api/classes/utils_src.DefaultLogger)

### Interfaces

- [ReadFileOrUrlOptions](/docs/api/interfaces/utils_src.ReadFileOrUrlOptions)

### Type aliases

- [ResolverDataBasedFactory](utils_src#resolverdatabasedfactory)

### Variables

- [AggregateError](utils_src#aggregateerror)
- [globalLruCache](utils_src#globallrucache)
- [stringInterpolator](utils_src#stringinterpolator)

### Functions

- [applyRequestTransforms](utils_src#applyrequesttransforms)
- [applyResultTransforms](utils_src#applyresulttransforms)
- [applySchemaTransforms](utils_src#applyschematransforms)
- [defaultImportFn](utils_src#defaultimportfn)
- [extractResolvers](utils_src#extractresolvers)
- [flatString](utils_src#flatstring)
- [getCachedFetch](utils_src#getcachedfetch)
- [getDocumentNodeAndSDL](utils_src#getdocumentnodeandsdl)
- [getHeadersObject](utils_src#getheadersobject)
- [getInterpolatedHeadersFactory](utils_src#getinterpolatedheadersfactory)
- [getInterpolatedStringFactory](utils_src#getinterpolatedstringfactory)
- [groupTransforms](utils_src#grouptransforms)
- [hashObject](utils_src#hashobject)
- [isUrl](utils_src#isurl)
- [jitExecutorFactory](utils_src#jitexecutorfactory)
- [jsonFlatStringify](utils_src#jsonflatstringify)
- [loadFromModuleExportExpression](utils_src#loadfrommoduleexportexpression)
- [mkdir](utils_src#mkdir)
- [parseInterpolationStrings](utils_src#parseinterpolationstrings)
- [parseWithCache](utils_src#parsewithcache)
- [pathExists](utils_src#pathexists)
- [printWithCache](utils_src#printwithcache)
- [readFile](utils_src#readfile)
- [readFileOrUrl](utils_src#readfileorurl)
- [readUrl](utils_src#readurl)
- [resolveAdditionalResolvers](utils_src#resolveadditionalresolvers)
- [rmdirs](utils_src#rmdirs)
- [sanitizeNameForGraphQL](utils_src#sanitizenameforgraphql)
- [withCancel](utils_src#withcancel)
- [writeFile](utils_src#writefile)
- [writeJSON](utils_src#writejson)

## Type aliases

### ResolverDataBasedFactory

Ƭ **ResolverDataBasedFactory**<`T`\>: (`data`: [`ResolverData`](types_src#resolverdata)) => `T`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Type declaration

▸ (`data`): `T`

##### Parameters

| Name | Type |
| :------ | :------ |
| `data` | [`ResolverData`](types_src#resolverdata) |

##### Returns

`T`

#### Defined in

[packages/utils/src/resolver-data-factory.ts:4](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/resolver-data-factory.ts#L4)

## Variables

### AggregateError

• **AggregateError**: `AggregateErrorConstructor`

#### Defined in

node_modules/@graphql-tools/utils/AggregateError.d.ts:9

___

### globalLruCache

• **globalLruCache**: `Lru`<`any`\>

#### Defined in

[packages/utils/src/global-lru-cache.ts:3](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/global-lru-cache.ts#L3)

___

### stringInterpolator

• **stringInterpolator**: `any`

#### Defined in

[packages/utils/src/string-interpolator.ts:5](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/string-interpolator.ts#L5)

## Functions

### applyRequestTransforms

▸ **applyRequestTransforms**(`originalRequest`, `delegationContext`, `transformationContext`, `transforms`): `ExecutionRequest`<`Record`<`string`, `any`\>, `any`, `any`, `Record`<`string`, `any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalRequest` | `ExecutionRequest`<`Record`<`string`, `any`\>, `any`, `any`, `Record`<`string`, `any`\>\> |
| `delegationContext` | `DelegationContext`<`Record`<`string`, `any`\>\> |
| `transformationContext` | `Record`<`string`, `any`\> |
| `transforms` | `Transform`<`any`, `Record`<`string`, `any`\>\>[] |

#### Returns

`ExecutionRequest`<`Record`<`string`, `any`\>, `any`, `any`, `Record`<`string`, `any`\>\>

#### Defined in

[packages/utils/src/apply-transforms.ts:17](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/apply-transforms.ts#L17)

___

### applyResultTransforms

▸ **applyResultTransforms**(`originalResult`, `delegationContext`, `transformationContext`, `transforms`): `ExecutionResult`<`Record`<`string`, `any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalResult` | `ExecutionResult`<`Record`<`string`, `any`\>\> |
| `delegationContext` | `DelegationContext`<`Record`<`string`, `any`\>\> |
| `transformationContext` | `Record`<`string`, `any`\> |
| `transforms` | `Transform`<`any`, `Record`<`string`, `any`\>\>[] |

#### Returns

`ExecutionResult`<`Record`<`string`, `any`\>\>

#### Defined in

[packages/utils/src/apply-transforms.ts:41](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/apply-transforms.ts#L41)

___

### applySchemaTransforms

▸ **applySchemaTransforms**(`originalWrappingSchema`, `subschemaConfig`, `transformedSchema`, `transforms`): `GraphQLSchema`

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalWrappingSchema` | `GraphQLSchema` |
| `subschemaConfig` | `SubschemaConfig`<`any`, `any`, `any`, `Record`<`string`, `any`\>\> |
| `transformedSchema` | `GraphQLSchema` |
| `transforms` | `Transform`<`any`, `Record`<`string`, `any`\>\>[] |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/utils/src/apply-transforms.ts:5](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/apply-transforms.ts#L5)

___

### defaultImportFn

▸ **defaultImportFn**(`path`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/utils/src/defaultImportFn.ts:1](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/defaultImportFn.ts#L1)

___

### extractResolvers

▸ **extractResolvers**(`schema`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | `GraphQLSchema` |

#### Returns

`any`

#### Defined in

[packages/utils/src/extract-resolvers.ts:4](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/extract-resolvers.ts#L4)

___

### flatString

▸ **flatString**(`str`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `string` |

#### Returns

`string`

#### Defined in

[packages/utils/src/flat-string.ts:2](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/flat-string.ts#L2)

___

### getCachedFetch

▸ **getCachedFetch**(`cache`): typeof `crossFetch`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cache` | [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache)<`any`\> |

#### Returns

typeof `crossFetch`

#### Defined in

[packages/utils/src/read-file-or-url.ts:22](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L22)

___

### getDocumentNodeAndSDL

▸ **getDocumentNodeAndSDL**<`TData`, `TVariables`\>(`documentOrSDL`): `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TData` | `any` |
| `TVariables` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `documentOrSDL` | [`GraphQLOperation`](types_src#graphqloperation)<`TData`, `TVariables`\> |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `document` | `TypedDocumentNode`<`TData`, `TVariables`\> |
| `sdl` | `string` |

#### Defined in

[packages/utils/src/getDocumentNodeAndSDL.ts:5](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/getDocumentNodeAndSDL.ts#L5)

___

### getHeadersObject

▸ **getHeadersObject**(`headers`): `Record`<`string`, `string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `headers` | `Headers` |

#### Returns

`Record`<`string`, `string`\>

#### Defined in

[packages/utils/src/resolver-data-factory.ts:53](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/resolver-data-factory.ts#L53)

___

### getInterpolatedHeadersFactory

▸ **getInterpolatedHeadersFactory**(`nonInterpolatedHeaders?`): [`ResolverDataBasedFactory`](utils_src#resolverdatabasedfactory)<`Record`<`string`, `string`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `nonInterpolatedHeaders` | `Record`<`string`, `string`\> |

#### Returns

[`ResolverDataBasedFactory`](utils_src#resolverdatabasedfactory)<`Record`<`string`, `string`\>\>

#### Defined in

[packages/utils/src/resolver-data-factory.ts:38](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/resolver-data-factory.ts#L38)

___

### getInterpolatedStringFactory

▸ **getInterpolatedStringFactory**(`nonInterpolatedString`): [`ResolverDataBasedFactory`](utils_src#resolverdatabasedfactory)<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `nonInterpolatedString` | `string` |

#### Returns

[`ResolverDataBasedFactory`](utils_src#resolverdatabasedfactory)<`string`\>

#### Defined in

[packages/utils/src/resolver-data-factory.ts:34](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/resolver-data-factory.ts#L34)

___

### groupTransforms

▸ **groupTransforms**(`transforms`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `transforms` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)[] |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `noWrapTransforms` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)[] |
| `wrapTransforms` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)[] |

#### Defined in

[packages/utils/src/group-transforms.ts:3](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/group-transforms.ts#L3)

___

### hashObject

▸ **hashObject**(`value`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `any` |

#### Returns

`string`

#### Defined in

[packages/utils/src/hashObject.ts:3](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/hashObject.ts#L3)

___

### isUrl

▸ **isUrl**(`string`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `string` | `string` |

#### Returns

`boolean`

Whether `string` is a URL.

#### Defined in

node_modules/@types/is-url/index.d.ts:12

___

### jitExecutorFactory

▸ **jitExecutorFactory**(`schema`, `prefix`, `logger`): `Executor`

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | `GraphQLSchema` |
| `prefix` | `string` |
| `logger` | [`Logger`](types_src#logger) |

#### Returns

`Executor`

#### Defined in

[packages/utils/src/jitExecute.ts:8](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/jitExecute.ts#L8)

___

### jsonFlatStringify

▸ **jsonFlatStringify**<`T`\>(`data`, `replacer?`, `space?`): `string`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `T` |
| `replacer?` | (`key`: `string`, `value`: `any`) => `any` |
| `space?` | `string` \| `number` |

#### Returns

`string`

#### Defined in

[packages/utils/src/flat-string.ts:6](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/flat-string.ts#L6)

___

### loadFromModuleExportExpression

▸ **loadFromModuleExportExpression**<`T`\>(`expression`, `options`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `expression` | `string` \| `T` |
| `options` | `LoadFromModuleExportExpressionOptions` |

#### Returns

`Promise`<`T`\>

#### Defined in

[packages/utils/src/load-from-module-export-expression.ts:12](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/load-from-module-export-expression.ts#L12)

___

### mkdir

▸ **mkdir**(`path`, `options?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `options` | `MakeDirectoryOptions` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/utils/src/fs-operations.ts:43](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/fs-operations.ts#L43)

___

### parseInterpolationStrings

▸ **parseInterpolationStrings**(`interpolationStrings`, `argTypeMap?`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `interpolationStrings` | `string`[] |
| `argTypeMap?` | `Record`<`string`, `string`\> |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `args` | `Record`<`string`, `Object`\> |
| `contextVariables` | `string`[] |

#### Defined in

[packages/utils/src/resolver-data-factory.ts:6](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/resolver-data-factory.ts#L6)

___

### parseWithCache

▸ **parseWithCache**(`sdl`): `DocumentNode`

#### Parameters

| Name | Type |
| :------ | :------ |
| `sdl` | `string` |

#### Returns

`DocumentNode`

#### Defined in

[packages/utils/src/parseAndPrintWithCache.ts:6](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/parseAndPrintWithCache.ts#L6)

___

### pathExists

▸ **pathExists**(`path`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[packages/utils/src/fs-operations.ts:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/fs-operations.ts#L7)

___

### printWithCache

▸ **printWithCache**(`document`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `document` | `DocumentNode` |

#### Returns

`string`

#### Defined in

[packages/utils/src/parseAndPrintWithCache.ts:16](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/parseAndPrintWithCache.ts#L16)

___

### readFile

▸ **readFile**<`T`\>(`filePath`, `config?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `filePath` | `string` |
| `config?` | [`ReadFileOrUrlOptions`](/docs/api/interfaces/utils_src.ReadFileOrUrlOptions) |

#### Returns

`Promise`<`T`\>

#### Defined in

[packages/utils/src/read-file-or-url.ts:39](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L39)

___

### readFileOrUrl

▸ **readFileOrUrl**<`T`\>(`filePathOrUrl`, `config?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `filePathOrUrl` | `string` |
| `config?` | [`ReadFileOrUrlOptions`](/docs/api/interfaces/utils_src.ReadFileOrUrlOptions) |

#### Returns

`Promise`<`T`\>

#### Defined in

[packages/utils/src/read-file-or-url.ts:31](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L31)

___

### readUrl

▸ **readUrl**<`T`\>(`path`, `config?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `config?` | [`ReadFileOrUrlOptions`](/docs/api/interfaces/utils_src.ReadFileOrUrlOptions) |

#### Returns

`Promise`<`T`\>

#### Defined in

[packages/utils/src/read-file-or-url.ts:67](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L67)

___

### resolveAdditionalResolvers

▸ **resolveAdditionalResolvers**(`baseDir`, `additionalResolvers`, `importFn`, `pubsub`): `Promise`<`IResolvers`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `baseDir` | `string` |
| `additionalResolvers` | (`string` \| [`AdditionalStitchingResolverObject`](/docs/api/interfaces/types_src.YamlConfig.AdditionalStitchingResolverObject) \| [`AdditionalStitchingBatchResolverObject`](/docs/api/interfaces/types_src.YamlConfig.AdditionalStitchingBatchResolverObject) \| [`AdditionalSubscriptionObject`](/docs/api/interfaces/types_src.YamlConfig.AdditionalSubscriptionObject))[] |
| `importFn` | [`ImportFn`](types_src#importfn) |
| `pubsub` | [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub) |

#### Returns

`Promise`<`IResolvers`[]\>

#### Defined in

[packages/utils/src/resolve-additional-resolvers.ts:137](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/resolve-additional-resolvers.ts#L137)

___

### rmdirs

▸ **rmdirs**(`dir`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `dir` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/utils/src/fs-operations.ts:50](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/fs-operations.ts#L50)

___

### sanitizeNameForGraphQL

▸ **sanitizeNameForGraphQL**(`unsafeName`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `unsafeName` | `string` |

#### Returns

`string`

#### Defined in

[packages/utils/src/sanitize-name-for-graphql.ts:40](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/sanitize-name-for-graphql.ts#L40)

___

### withCancel

▸ **withCancel**<`T`\>(`asyncIterable`, `onCancel`): `AsyncIterable`<`T` \| `undefined`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `asyncIterable` | `AsyncIterable`<`T`\> |
| `onCancel` | () => `void` |

#### Returns

`AsyncIterable`<`T` \| `undefined`\>

#### Defined in

[packages/utils/src/with-cancel.ts:1](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/with-cancel.ts#L1)

___

### writeFile

▸ `Const` **writeFile**(`file`, `data`, `options?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `file` | `PathLike` \| `FileHandle` |
| `data` | `string` \| `ArrayBufferView` \| `Iterable`<`string` \| `ArrayBufferView`\> \| `AsyncIterable`<`string` \| `ArrayBufferView`\> \| `Stream` |
| `options?` | `ObjectEncodingOptions` & { `flag?`: `OpenMode` ; `mode?`: `Mode`  } & `Abortable` \| `BufferEncoding` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/utils/src/fs-operations.ts:33](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/fs-operations.ts#L33)

___

### writeJSON

▸ **writeJSON**<`T`\>(`path`, `data`, `replacer?`, `space?`): `Promise`<`void`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `data` | `T` |
| `replacer?` | (`key`: `string`, `value`: `any`) => `any` |
| `space?` | `string` \| `number` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/utils/src/fs-operations.ts:23](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/fs-operations.ts#L23)
