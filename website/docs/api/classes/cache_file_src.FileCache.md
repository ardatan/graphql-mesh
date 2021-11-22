---
title: 'FileCache'
---

# Class: FileCache<V\>

[cache/file/src](../modules/cache_file_src).FileCache

## Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `any` |

## Implements

- [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache)<`V`\>

## Table of contents

### Constructors

- [constructor](cache_file_src.FileCache#constructor)

### Properties

- [absolutePath](cache_file_src.FileCache#absolutepath)
- [json$](cache_file_src.FileCache#json$)
- [writeDataLoader](cache_file_src.FileCache#writedataloader)

### Methods

- [delete](cache_file_src.FileCache#delete)
- [get](cache_file_src.FileCache#get)
- [set](cache_file_src.FileCache#set)

## Constructors

### constructor

• **new FileCache**<`V`\>(`__namedParameters`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.importFn` | [`ImportFn`](../modules/types_src#importfn) |
| `__namedParameters.path` | `string` |

#### Defined in

[packages/cache/file/src/index.ts:12](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/file/src/index.ts#L12)

## Properties

### absolutePath

• **absolutePath**: `string`

#### Defined in

[packages/cache/file/src/index.ts:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/file/src/index.ts#L10)

___

### json$

• **json$**: `Promise`<`Record`<`string`, `V`\>\>

#### Defined in

[packages/cache/file/src/index.ts:9](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/file/src/index.ts#L9)

___

### writeDataLoader

• **writeDataLoader**: `DataLoader`<`any`, `any`, `any`\>

#### Defined in

[packages/cache/file/src/index.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/file/src/index.ts#L11)

## Methods

### delete

▸ **delete**(`name`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[delete](/docs/api/interfaces/types_src.KeyValueCache#delete)

#### Defined in

[packages/cache/file/src/index.ts:33](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/file/src/index.ts#L33)

___

### get

▸ **get**(`name`): `Promise`<`V`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

#### Returns

`Promise`<`V`\>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[get](/docs/api/interfaces/types_src.KeyValueCache#get)

#### Defined in

[packages/cache/file/src/index.ts:22](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/file/src/index.ts#L22)

___

### set

▸ **set**(`name`, `value`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `value` | `V` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[set](/docs/api/interfaces/types_src.KeyValueCache#set)

#### Defined in

[packages/cache/file/src/index.ts:27](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/file/src/index.ts#L27)
