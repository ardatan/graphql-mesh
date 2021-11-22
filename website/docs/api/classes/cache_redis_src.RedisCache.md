---
title: 'RedisCache'
---

# Class: RedisCache<V\>

[cache/redis/src](../modules/cache_redis_src).RedisCache

## Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `string` |

## Implements

- [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache)<`V`\>

## Table of contents

### Constructors

- [constructor](cache_redis_src.RedisCache#constructor)

### Methods

- [delete](cache_redis_src.RedisCache#delete)
- [get](cache_redis_src.RedisCache#get)
- [set](cache_redis_src.RedisCache#set)

## Constructors

### constructor

• **new RedisCache**<`V`\>(`options?`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `any` |

#### Defined in

[packages/cache/redis/src/index.ts:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/redis/src/index.ts#L10)

## Methods

### delete

▸ **delete**(`key`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`boolean`\>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[delete](/docs/api/interfaces/types_src.KeyValueCache#delete)

#### Defined in

[packages/cache/redis/src/index.ts:69](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/redis/src/index.ts#L69)

___

### get

▸ **get**(`key`): `Promise`<`V`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`V`\>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[get](/docs/api/interfaces/types_src.KeyValueCache#get)

#### Defined in

[packages/cache/redis/src/index.ts:60](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/redis/src/index.ts#L60)

___

### set

▸ **set**(`key`, `value`, `options?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `V` |
| `options?` | [`KeyValueCacheSetOptions`](/docs/api/interfaces/types_src.KeyValueCacheSetOptions) |

#### Returns

`Promise`<`void`\>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[set](/docs/api/interfaces/types_src.KeyValueCache#set)

#### Defined in

[packages/cache/redis/src/index.ts:51](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/redis/src/index.ts#L51)
