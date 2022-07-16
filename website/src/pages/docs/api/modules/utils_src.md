---
id: "utils"
title: "@graphql-mesh/utils"
---

## Table of contents

### Classes

- [DefaultLogger](/docs/api/classes/utils_src.DefaultLogger)
- [PubSub](/docs/api/classes/utils_src.PubSub)

### Interfaces

- [ReadFileOrUrlOptions](/docs/api/interfaces/utils_src.ReadFileOrUrlOptions)

### Type Aliases

- [LRUCache](utils_src#lrucache)

### Functions

- [applyRequestTransforms](utils_src#applyrequesttransforms)
- [applyResultTransforms](utils_src#applyresulttransforms)
- [applySchemaTransforms](utils_src#applyschematransforms)
- [createLruCache](utils_src#createlrucache)
- [debugColor](utils_src#debugcolor)
- [defaultImportFn](utils_src#defaultimportfn)
- [errorColor](utils_src#errorcolor)
- [extractResolvers](utils_src#extractresolvers)
- [fileURLToPath](utils_src#fileurltopath)
- [getHeadersObj](utils_src#getheadersobj)
- [gql](utils_src#gql)
- [groupTransforms](utils_src#grouptransforms)
- [infoColor](utils_src#infocolor)
- [isUrl](utils_src#isurl)
- [loadFromModuleExportExpression](utils_src#loadfrommoduleexportexpression)
- [loadYaml](utils_src#loadyaml)
- [mkdir](utils_src#mkdir)
- [parseWithCache](utils_src#parsewithcache)
- [pathExists](utils_src#pathexists)
- [printWithCache](utils_src#printwithcache)
- [readFile](utils_src#readfile)
- [readFileOrUrl](utils_src#readfileorurl)
- [readUrl](utils_src#readurl)
- [resolveAdditionalResolvers](utils_src#resolveadditionalresolvers)
- [resolveAdditionalResolversWithoutImport](utils_src#resolveadditionalresolverswithoutimport)
- [rmdirs](utils_src#rmdirs)
- [sanitizeNameForGraphQL](utils_src#sanitizenameforgraphql)
- [titleBold](utils_src#titlebold)
- [warnColor](utils_src#warncolor)
- [withCancel](utils_src#withcancel)
- [writeFile](utils_src#writefile)
- [writeJSON](utils_src#writejson)

## Type Aliases

### LRUCache

Ƭ **LRUCache**: `Lru`

#### Defined in

[packages/utils/src/global-lru-cache.ts:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/global-lru-cache.ts#L7)

## Functions

### applyRequestTransforms

▸ **applyRequestTransforms**(`originalRequest`, `delegationContext`, `transformationContext`, `transforms`): `ExecutionRequest`\<`Record`\<`string`, `any`>, `any`, `any`, `Record`\<`string`, `any`>>

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalRequest` | `ExecutionRequest`\<`Record`\<`string`, `any`>, `any`, `any`, `Record`\<`string`, `any`>> |
| `delegationContext` | `DelegationContext`\<`Record`\<`string`, `any`>> |
| `transformationContext` | `Record`\<`string`, `any`> |
| `transforms` | `Transform`\<`any`, `Record`\<`string`, `any`>>[] |

#### Returns

`ExecutionRequest`\<`Record`\<`string`, `any`>, `any`, `any`, `Record`\<`string`, `any`>>

#### Defined in

[packages/utils/src/apply-transforms.ts:17](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/apply-transforms.ts#L17)

___

### applyResultTransforms

▸ **applyResultTransforms**(`originalResult`, `delegationContext`, `transformationContext`, `transforms`): `ExecutionResult`\<`Record`\<`string`, `any`>>

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalResult` | `ExecutionResult`\<`Record`\<`string`, `any`>> |
| `delegationContext` | `DelegationContext`\<`Record`\<`string`, `any`>> |
| `transformationContext` | `Record`\<`string`, `any`> |
| `transforms` | `Transform`\<`any`, `Record`\<`string`, `any`>>[] |

#### Returns

`ExecutionResult`\<`Record`\<`string`, `any`>>

#### Defined in

[packages/utils/src/apply-transforms.ts:41](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/apply-transforms.ts#L41)

___

### applySchemaTransforms

▸ **applySchemaTransforms**(`originalWrappingSchema`, `subschemaConfig`, `transformedSchema`, `transforms`): `GraphQLSchema`

#### Parameters

| Name | Type |
| :------ | :------ |
| `originalWrappingSchema` | `GraphQLSchema` |
| `subschemaConfig` | `SubschemaConfig`\<`any`, `any`, `any`, `Record`\<`string`, `any`>> |
| `transformedSchema` | `GraphQLSchema` |
| `transforms` | `Transform`\<`any`, `Record`\<`string`, `any`>>[] |

#### Returns

`GraphQLSchema`

#### Defined in

[packages/utils/src/apply-transforms.ts:5](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/apply-transforms.ts#L5)

___

### createLruCache

▸ **createLruCache**(`max?`, `ttl?`): `Lru`\<`any`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `max?` | `number` |
| `ttl?` | `number` |

#### Returns

`Lru`\<`any`>

#### Defined in

[packages/utils/src/global-lru-cache.ts:3](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/global-lru-cache.ts#L3)

___

### debugColor

▸ **debugColor**(`msg`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`string`

#### Defined in

[packages/utils/src/logger.ts:23](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/logger.ts#L23)

___

### defaultImportFn

▸ **defaultImportFn**(`path`): `Promise`\<`any`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Returns

`Promise`\<`any`>

#### Defined in

[packages/utils/src/defaultImportFn.ts:1](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/defaultImportFn.ts#L1)

___

### errorColor

▸ **errorColor**(`msg`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`string`

#### Defined in

[packages/utils/src/logger.ts:22](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/logger.ts#L22)

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

### fileURLToPath

▸ **fileURLToPath**(`url`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`string`

#### Defined in

[packages/utils/src/fileURLToPath.ts:42](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/fileURLToPath.ts#L42)

___

### getHeadersObj

▸ **getHeadersObj**(`headers`): `Record`\<`string`, `string`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `headers` | `Headers` |

#### Returns

`Record`\<`string`, `string`>

#### Defined in

[packages/utils/src/getHeadersObj.ts:9](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/getHeadersObj.ts#L9)

___

### gql

▸ **gql**(`__namedParameters`, ...`args`): `DocumentNode`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `TemplateStringsArray` |
| `...args` | (`string` \| `DocumentNode`)[] |

#### Returns

`DocumentNode`

#### Defined in

[packages/utils/src/parseAndPrintWithCache.ts:30](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/parseAndPrintWithCache.ts#L30)

___

### groupTransforms

▸ **groupTransforms**(`transforms`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `transforms` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)\<`any`>[] |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `noWrapTransforms` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)\<`any`>[] |
| `wrapTransforms` | [`MeshTransform`](/docs/api/interfaces/types_src.MeshTransform)\<`any`>[] |

#### Defined in

[packages/utils/src/group-transforms.ts:3](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/group-transforms.ts#L3)

___

### infoColor

▸ **infoColor**(`msg`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`string`

#### Defined in

[packages/utils/src/logger.ts:21](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/logger.ts#L21)

___

### isUrl

▸ **isUrl**(`str`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `string` |

#### Returns

`boolean`

#### Defined in

[packages/utils/src/read-file-or-url.ts:15](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L15)

___

### loadFromModuleExportExpression

▸ **loadFromModuleExportExpression**\<`T`>(`expression`, `options`): `Promise`\<`T`>

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

`Promise`\<`T`>

#### Defined in

[packages/utils/src/load-from-module-export-expression.ts:12](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/load-from-module-export-expression.ts#L12)

___

### loadYaml

▸ **loadYaml**(`filepath`, `content`, `logger`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `filepath` | `string` |
| `content` | `string` |
| `logger` | [`Logger`](types_src#logger) |

#### Returns

`any`

#### Defined in

[packages/utils/src/read-file-or-url.ts:70](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L70)

___

### mkdir

▸ **mkdir**(`path`, `options?`): `Promise`\<`void`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `options` | `MakeDirectoryOptions` |

#### Returns

`Promise`\<`void`>

#### Defined in

[packages/utils/src/fs-operations.ts:39](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/fs-operations.ts#L39)

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

[packages/utils/src/parseAndPrintWithCache.ts:8](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/parseAndPrintWithCache.ts#L8)

___

### pathExists

▸ **pathExists**(`path`): `Promise`\<`boolean`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Returns

`Promise`\<`boolean`>

#### Defined in

[packages/utils/src/fs-operations.ts:3](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/fs-operations.ts#L3)

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

[packages/utils/src/parseAndPrintWithCache.ts:19](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/parseAndPrintWithCache.ts#L19)

___

### readFile

▸ **readFile**\<`T`>(`fileExpression`, `__namedParameters`): `Promise`\<`T`>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `fileExpression` | `string` |
| `__namedParameters` | [`ReadFileOrUrlOptions`](/docs/api/interfaces/utils_src.ReadFileOrUrlOptions) |

#### Returns

`Promise`\<`T`>

#### Defined in

[packages/utils/src/read-file-or-url.ts:80](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L80)

___

### readFileOrUrl

▸ **readFileOrUrl**\<`T`>(`filePathOrUrl`, `config`): `Promise`\<`T`>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `filePathOrUrl` | `string` |
| `config` | [`ReadFileOrUrlOptions`](/docs/api/interfaces/utils_src.ReadFileOrUrlOptions) |

#### Returns

`Promise`\<`T`>

#### Defined in

[packages/utils/src/read-file-or-url.ts:25](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L25)

___

### readUrl

▸ **readUrl**\<`T`>(`path`, `config`): `Promise`\<`T`>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `config` | [`ReadFileOrUrlOptions`](/docs/api/interfaces/utils_src.ReadFileOrUrlOptions) |

#### Returns

`Promise`\<`T`>

#### Defined in

[packages/utils/src/read-file-or-url.ts:118](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/read-file-or-url.ts#L118)

___

### resolveAdditionalResolvers

▸ **resolveAdditionalResolvers**(`baseDir`, `additionalResolvers`, `importFn`, `pubsub`): `Promise`\<`IResolvers`[]>

#### Parameters

| Name | Type |
| :------ | :------ |
| `baseDir` | `string` |
| `additionalResolvers` | (`string` \| [`AdditionalStitchingResolverObject`](/docs/api/interfaces/types_src.YamlConfig.AdditionalStitchingResolverObject) \| [`AdditionalStitchingBatchResolverObject`](/docs/api/interfaces/types_src.YamlConfig.AdditionalStitchingBatchResolverObject) \| [`AdditionalSubscriptionObject`](/docs/api/interfaces/types_src.YamlConfig.AdditionalSubscriptionObject))[] |
| `importFn` | [`ImportFn`](types_src#importfn) |
| `pubsub` | [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub) |

#### Returns

`Promise`\<`IResolvers`[]>

#### Defined in

[packages/utils/src/resolve-additional-resolvers.ts:278](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/resolve-additional-resolvers.ts#L278)

___

### resolveAdditionalResolversWithoutImport

▸ **resolveAdditionalResolversWithoutImport**(`additionalResolver`, `pubsub`): `IResolvers`

#### Parameters

| Name | Type |
| :------ | :------ |
| `additionalResolver` | [`AdditionalStitchingResolverObject`](/docs/api/interfaces/types_src.YamlConfig.AdditionalStitchingResolverObject) \| [`AdditionalStitchingBatchResolverObject`](/docs/api/interfaces/types_src.YamlConfig.AdditionalStitchingBatchResolverObject) \| [`AdditionalSubscriptionObject`](/docs/api/interfaces/types_src.YamlConfig.AdditionalSubscriptionObject) |
| `pubsub` | [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub) |

#### Returns

`IResolvers`

#### Defined in

[packages/utils/src/resolve-additional-resolvers.ts:146](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/resolve-additional-resolvers.ts#L146)

___

### rmdirs

▸ **rmdirs**(`dir`): `Promise`\<`void`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `dir` | `string` |

#### Returns

`Promise`\<`void`>

#### Defined in

[packages/utils/src/fs-operations.ts:46](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/fs-operations.ts#L46)

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

### titleBold

▸ **titleBold**(`msg`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`string`

#### Defined in

[packages/utils/src/logger.ts:24](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/logger.ts#L24)

___

### warnColor

▸ **warnColor**(`msg`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`string`

#### Defined in

[packages/utils/src/logger.ts:20](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/logger.ts#L20)

___

### withCancel

▸ **withCancel**\<`T`>(`asyncIterable`, `onCancel`): `AsyncIterable`\<`T` \| `undefined`>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `asyncIterable` | `AsyncIterable`\<`T`> |
| `onCancel` | () => `void` |

#### Returns

`AsyncIterable`\<`T` \| `undefined`>

#### Defined in

[packages/utils/src/with-cancel.ts:1](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/with-cancel.ts#L1)

___

### writeFile

▸ **writeFile**(`file`, `data`, `options?`): `Promise`\<`void`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `file` | `PathLike` \| `FileHandle` |
| `data` | `string` \| `ArrayBufferView` \| `Iterable`\<`string` \| `ArrayBufferView`> \| `AsyncIterable`\<`string` \| `ArrayBufferView`> \| `Stream` |
| `options?` | `BufferEncoding` \| `ObjectEncodingOptions` & \{ `flag?`: `OpenMode` ; `mode?`: `Mode`  } & `Abortable` |

#### Returns

`Promise`\<`void`>

#### Defined in

[packages/utils/src/fs-operations.ts:29](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/fs-operations.ts#L29)

___

### writeJSON

▸ **writeJSON**\<`T`>(`path`, `data`, `replacer?`, `space?`): `Promise`\<`void`>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `data` | `T` |
| `replacer?` | (`this`: `any`, `key`: `string`, `value`: `any`) => `any` |
| `space?` | `string` \| `number` |

#### Returns

`Promise`\<`void`>

#### Defined in

[packages/utils/src/fs-operations.ts:19](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/fs-operations.ts#L19)
