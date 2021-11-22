---
title: 'StoreCache'
---

# Class: StoreCache<V\>

[cache/store/src](../modules/cache_store_src).StoreCache

## Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `any` |

## Implements

- [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache)<`V`\>

## Table of contents

### Constructors

- [constructor](cache_store_src.StoreCache#constructor)

### Methods

- [delete](cache_store_src.StoreCache#delete)
- [get](cache_store_src.StoreCache#get)
- [set](cache_store_src.StoreCache#set)

## Constructors

### constructor

• **new StoreCache**<`V`\>(`__namedParameters`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `V` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.store` | [`MeshStore`](store_src.MeshStore) |

#### Defined in

[packages/cache/store/src/index.ts:8](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/store/src/index.ts#L8)

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

[packages/cache/store/src/index.ts:34](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/store/src/index.ts#L34)

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

[packages/cache/store/src/index.ts:16](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/store/src/index.ts#L16)

___

### set

▸ **set**(`name`, `value`, `options`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `value` | `V` |
| `options` | [`KeyValueCacheSetOptions`](/docs/api/interfaces/types_src.KeyValueCacheSetOptions) |

#### Returns

`Promise`<`void`\>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[set](/docs/api/interfaces/types_src.KeyValueCache#set)

#### Defined in

[packages/cache/store/src/index.ts:26](https://github.com/Urigo/graphql-mesh/blob/master/packages/cache/store/src/index.ts#L26)
