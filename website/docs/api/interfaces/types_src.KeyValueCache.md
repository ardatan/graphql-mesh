---
title: 'KeyValueCache'
---

# Interface: KeyValueCache<V\>

[types/src](../modules/types_src).KeyValueCache

## Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `any` |

## Implemented by

- [`CFWorkerKVCache`](/docs/api/classes/cache_cfw_kv_src.CFWorkerKVCache)
- [`FileCache`](/docs/api/classes/cache_file_src.FileCache)
- [`LocalforageCache`](/docs/api/classes/cache_localforage_src.LocalforageCache)
- [`RedisCache`](/docs/api/classes/cache_redis_src.RedisCache)

## Table of contents

### Methods

- [delete](types_src.KeyValueCache#delete)
- [get](types_src.KeyValueCache#get)
- [getKeysByPrefix](types_src.KeyValueCache#getkeysbyprefix)
- [set](types_src.KeyValueCache#set)

## Methods

### delete

▸ **delete**(`key`): `Promise`<`boolean` \| `void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`boolean` \| `void`\>

___

### get

▸ **get**(`key`): `Promise`<`V`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`V`\>

___

### getKeysByPrefix

▸ **getKeysByPrefix**(`prefix`): `Promise`<`string`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `prefix` | `string` |

#### Returns

`Promise`<`string`[]\>

___

### set

▸ **set**(`key`, `value`, `options?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `V` |
| `options?` | [`KeyValueCacheSetOptions`](types_src.KeyValueCacheSetOptions) |

#### Returns

`Promise`<`void`\>
