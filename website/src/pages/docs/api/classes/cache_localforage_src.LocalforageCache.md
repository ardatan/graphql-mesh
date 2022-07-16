---
title: 'LocalforageCache'
---

# Class: LocalforageCache\<V>

[cache/localforage/src](../modules/cache_localforage_src).LocalforageCache

## Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `any` |

## Implements

- [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache)\<`V`>

## Table of contents

### Constructors

- [constructor](cache_localforage_src.LocalforageCache#constructor)

### Methods

- [delete](cache_localforage_src.LocalforageCache#delete)
- [get](cache_localforage_src.LocalforageCache#get)
- [getKeysByPrefix](cache_localforage_src.LocalforageCache#getkeysbyprefix)
- [set](cache_localforage_src.LocalforageCache#set)

## Constructors

### constructor

• **new LocalforageCache**\<`V`>(`config?`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `config?` | [`LocalforageConfig`](/docs/api/interfaces/types_src.YamlConfig.LocalforageConfig) |

#### Defined in

[packages/cache/localforage/src/index.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/localforage/src/index.ts#L11)

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

[packages/cache/localforage/src/index.ts:41](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/localforage/src/index.ts#L41)

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

[packages/cache/localforage/src/index.ts:20](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/localforage/src/index.ts#L20)

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

#### Defined in

[packages/cache/localforage/src/index.ts:28](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/localforage/src/index.ts#L28)

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

[packages/cache/localforage/src/index.ts:33](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/localforage/src/index.ts#L33)
