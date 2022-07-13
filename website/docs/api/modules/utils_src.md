---
id: "utils"
title: "@graphql-mesh/utils"
sidebar_label: "utils"
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

___

### debugColor

▸ **debugColor**(`msg`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`string`

___

### defaultImportFn

▸ **defaultImportFn**(`path`): `Promise`\<`any`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Returns

`Promise`\<`any`>

___

### errorColor

▸ **errorColor**(`msg`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`string`

___

### extractResolvers

▸ **extractResolvers**(`schema`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `schema` | `GraphQLSchema` |

#### Returns

`any`

___

### fileURLToPath

▸ **fileURLToPath**(`url`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `url` | `string` |

#### Returns

`string`

___

### getHeadersObj

▸ **getHeadersObj**(`headers`): `Record`\<`string`, `string`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `headers` | `Headers` |

#### Returns

`Record`\<`string`, `string`>

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

___

### infoColor

▸ **infoColor**(`msg`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`string`

___

### isUrl

▸ **isUrl**(`str`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `str` | `string` |

#### Returns

`boolean`

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

___

### parseWithCache

▸ **parseWithCache**(`sdl`): `DocumentNode`

#### Parameters

| Name | Type |
| :------ | :------ |
| `sdl` | `string` |

#### Returns

`DocumentNode`

___

### pathExists

▸ **pathExists**(`path`): `Promise`\<`boolean`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Returns

`Promise`\<`boolean`>

___

### printWithCache

▸ **printWithCache**(`document`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `document` | `DocumentNode` |

#### Returns

`string`

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

___

### rmdirs

▸ **rmdirs**(`dir`): `Promise`\<`void`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `dir` | `string` |

#### Returns

`Promise`\<`void`>

___

### sanitizeNameForGraphQL

▸ **sanitizeNameForGraphQL**(`unsafeName`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `unsafeName` | `string` |

#### Returns

`string`

___

### titleBold

▸ **titleBold**(`msg`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`string`

___

### warnColor

▸ **warnColor**(`msg`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `string` |

#### Returns

`string`

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

___

### writeFile

▸ **writeFile**(`file`, `data`, `options?`): `Promise`\<`void`>

Asynchronously writes data to a file, replacing the file if it already exists.`data` can be a string, a `Buffer`, or, an object with an own (not inherited)`toString` function property.

The `encoding` option is ignored if `data` is a buffer.

If `options` is a string, then it specifies the encoding.

The `mode` option only affects the newly created file. See `fs.open()` for more details.

Any specified `FileHandle` has to support writing.

It is unsafe to use `fsPromises.writeFile()` multiple times on the same file
without waiting for the promise to be settled.

Similarly to `fsPromises.readFile` \- `fsPromises.writeFile` is a convenience
method that performs multiple `write` calls internally to write the buffer
passed to it. For performance sensitive code consider using `fs.createWriteStream()`.

It is possible to use an `AbortSignal` to cancel an `fsPromises.writeFile()`.
Cancelation is "best effort", and some amount of data is likely still
to be written.

```js
import \{ writeFile } from 'fs/promises';
import \{ Buffer } from 'buffer';

try \{
  const controller = new AbortController();
  const \{ signal } = controller;
  const data = new Uint8Array(Buffer.from('Hello Node.js'));
  const promise = writeFile('message.txt', data, \{ signal });

  // Abort the request before the promise settles.
  controller.abort();

  await promise;
} catch (err) \{
  // When a request is aborted - err is an AbortError
  console.error(err);
}
```

Aborting an ongoing request does not abort individual operating
system requests but rather the internal buffering `fs.writeFile` performs.

**`Since`**

v10.0.0

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `file` | `PathLike` \| `FileHandle` | filename or `FileHandle` |
| `data` | `string` \| `ArrayBufferView` \| `Iterable`\<`string` \| `ArrayBufferView`> \| `AsyncIterable`\<`string` \| `ArrayBufferView`> \| `Stream` | - |
| `options?` | `BufferEncoding` \| `ObjectEncodingOptions` & \{ `flag?`: `OpenMode` ; `mode?`: `Mode`  } & `Abortable` | - |

#### Returns

`Promise`\<`void`>

Fulfills with `undefined` upon success.

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
