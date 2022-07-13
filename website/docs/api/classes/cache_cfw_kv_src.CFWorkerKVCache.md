---
title: 'CFWorkerKVCache'
---

# Class: CFWorkerKVCache

[cache/cfw-kv/src](../modules/cache_cfw_kv_src).CFWorkerKVCache

## Implements

- [`KeyValueCache`](/docs/api/interfaces/types_src.KeyValueCache)

## Table of contents

### Constructors

- [constructor](cache_cfw_kv_src.CFWorkerKVCache#constructor)

### Methods

- [delete](cache_cfw_kv_src.CFWorkerKVCache#delete)
- [get](cache_cfw_kv_src.CFWorkerKVCache#get)
- [getKeysByPrefix](cache_cfw_kv_src.CFWorkerKVCache#getkeysbyprefix)
- [set](cache_cfw_kv_src.CFWorkerKVCache#set)

## Constructors

### constructor

• **new CFWorkerKVCache**(`config`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Object` |
| `config.logger` | [`Logger`](../modules/types_src#logger) |
| `config.namespace` | `string` |

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

___

### get

▸ **get**<`T`\>(`key`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`T`\>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[get](/docs/api/interfaces/types_src.KeyValueCache#get)

___

### getKeysByPrefix

▸ **getKeysByPrefix**(`prefix`): `Promise`<`string`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `prefix` | `string` |

#### Returns

`Promise`<`string`[]\>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[getKeysByPrefix](/docs/api/interfaces/types_src.KeyValueCache#getkeysbyprefix)

___

### set

▸ **set**(`key`, `value`, `options?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `value` | `any` |
| `options?` | `Object` |
| `options.ttl?` | `number` |

#### Returns

`Promise`<`void`\>

#### Implementation of

[KeyValueCache](/docs/api/interfaces/types_src.KeyValueCache).[set](/docs/api/interfaces/types_src.KeyValueCache#set)
