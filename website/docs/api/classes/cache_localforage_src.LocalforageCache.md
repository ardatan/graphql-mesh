---
title: 'LocalforageCache'
---

# Class: LocalforageCache<V\>

[cache/localforage/src](../modules/cache_localforage_src).LocalforageCache

## Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `any` |

## Implements

- [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache)<`V`\>

## Table of contents

### Constructors

- [constructor](cache_localforage_src.LocalforageCache#constructor)

### Methods

- [delete](cache_localforage_src.LocalforageCache#delete)
- [get](cache_localforage_src.LocalforageCache#get)
- [set](cache_localforage_src.LocalforageCache#set)

## Constructors

### constructor

• **new LocalforageCache**<`V`\>(`config`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | [`LocalforageConfig`](/docs/api/interfaces/types_src.YamlConfig.LocalforageConfig) & { `importFn`: [`ImportFn`](../modules/types_src#importfn)  } |

#### Defined in

[packages/cache/localforage/src/index.ts:5](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/localforage/src/index.ts#L5)

## Methods

### delete

▸ **delete**(`key`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[delete](/docs/api/interfaces/types_src.KeyValueCache#delete)

#### Defined in

[packages/cache/localforage/src/index.ts:51](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/localforage/src/index.ts#L51)

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

[packages/cache/localforage/src/index.ts:33](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/localforage/src/index.ts#L33)

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

[packages/cache/localforage/src/index.ts:42](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/localforage/src/index.ts#L42)
