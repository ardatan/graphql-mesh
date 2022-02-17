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

- [`FileCache`](/docs/api/classes/cache_file_src.FileCache)
- [`InMemoryLRUCache`](/docs/api/classes/cache_inmemory_lru_src.InMemoryLRUCache)
- [`LocalforageCache`](/docs/api/classes/cache_localforage_src.LocalforageCache)
- [`RedisCache`](/docs/api/classes/cache_redis_src.RedisCache)
- [`StoreCache`](/docs/api/classes/cache_store_src.StoreCache)

## Table of contents

### Methods

- [delete](types_src.KeyValueCache#delete)
- [get](types_src.KeyValueCache#get)
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

#### Defined in

node_modules/fetchache/index.d.ts:25

___

### get

▸ **get**(`key`): `Promise`<`V`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`V`\>

#### Defined in

node_modules/fetchache/index.d.ts:23

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

#### Defined in

node_modules/fetchache/index.d.ts:24
