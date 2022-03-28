---
title: 'InMemoryLRUCache'
---

# Class: InMemoryLRUCache\<V>

[cache/inmemory-lru/src](../modules/cache_inmemory_lru_src).InMemoryLRUCache

## Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `any` |

## Implements

- [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache)\<`V`>

## Table of contents

### Constructors

- [constructor](cache_inmemory_lru_src.InMemoryLRUCache#constructor)

### Methods

- [delete](cache_inmemory_lru_src.InMemoryLRUCache#delete)
- [get](cache_inmemory_lru_src.InMemoryLRUCache#get)
- [set](cache_inmemory_lru_src.InMemoryLRUCache#set)

## Constructors

### constructor

• **new InMemoryLRUCache**\<`V`>(`options?`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`InMemoryLRUConfig`](/docs/api/interfaces/types_src.YamlConfig.InMemoryLRUConfig) |

#### Defined in

[packages/cache/inmemory-lru/src/index.ts:10](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/inmemory-lru/src/index.ts#L10)

## Methods

### delete

▸ **delete**(`key`): `Promise`\<`void`>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`\<`void`>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[delete](/docs/api/interfaces/types_src.KeyValueCache#delete)

#### Defined in

[packages/cache/inmemory-lru/src/index.ts:38](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/inmemory-lru/src/index.ts#L38)

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

#### Defined in

[packages/cache/inmemory-lru/src/index.ts:20](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/inmemory-lru/src/index.ts#L20)

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

#### Defined in

[packages/cache/inmemory-lru/src/index.ts:30](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/inmemory-lru/src/index.ts#L30)
