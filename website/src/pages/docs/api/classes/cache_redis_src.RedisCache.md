---
title: 'RedisCache'
---

# Class: RedisCache\<V>

[cache/redis/src](../modules/cache_redis_src).RedisCache

## Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `string` |

## Implements

- [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache)\<`V`>

## Table of contents

### Constructors

- [constructor](cache_redis_src.RedisCache#constructor)

### Methods

- [delete](cache_redis_src.RedisCache#delete)
- [get](cache_redis_src.RedisCache#get)
- [getKeysByPrefix](cache_redis_src.RedisCache#getkeysbyprefix)
- [set](cache_redis_src.RedisCache#set)

## Constructors

### constructor

• **new RedisCache**\<`V`>(`options`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`RedisConfig`](/docs/api/interfaces/types_src.YamlConfig.RedisConfig) & \{ `pubsub`: [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub)  } |

## Methods

### delete

▸ **delete**(`key`): `Promise`\<`boolean`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`\<`boolean`>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[delete](/docs/api/interfaces/types_src.KeyValueCache#delete)

___

### get

▸ **get**(`key`): `Promise`\<`V`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`\<`V`>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[get](/docs/api/interfaces/types_src.KeyValueCache#get)

___

### getKeysByPrefix

▸ **getKeysByPrefix**(`prefix`): `Promise`\<`string`[]>

#### Parameters

| Name | Type |
| :------ | :------ |
| `prefix` | `string` |

#### Returns

`Promise`\<`string`[]>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[getKeysByPrefix](/docs/api/interfaces/types_src.KeyValueCache#getkeysbyprefix)

___

### set

▸ **set**(`key`, `value`, `options?`): `Promise`\<`void`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `V` |
| `options?` | [`KeyValueCacheSetOptions`](/docs/api/interfaces/types_src.KeyValueCacheSetOptions) |

#### Returns

`Promise`\<`void`>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[set](/docs/api/interfaces/types_src.KeyValueCache#set)
