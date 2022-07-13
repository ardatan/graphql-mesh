---
title: 'InMemoryStoreStorageAdapter'
---

# Class: InMemoryStoreStorageAdapter

[store/src](../modules/store_src).InMemoryStoreStorageAdapter

## Implements

- [`StoreStorageAdapter`](../modules/store_src#storestorageadapter)

## Table of contents

### Constructors

- [constructor](store_src.InMemoryStoreStorageAdapter#constructor)

### Methods

- [clear](store_src.InMemoryStoreStorageAdapter#clear)
- [delete](store_src.InMemoryStoreStorageAdapter#delete)
- [read](store_src.InMemoryStoreStorageAdapter#read)
- [write](store_src.InMemoryStoreStorageAdapter#write)

## Constructors

### constructor

• **new InMemoryStoreStorageAdapter**()

## Methods

### clear

▸ **clear**(): `void`

#### Returns

`void`

___

### delete

▸ **delete**(`key`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`void`\>

#### Implementation of

StoreStorageAdapter.delete

___

### read

▸ **read**<`TData`\>(`key`, `options`): `Promise`<`TData`\>

#### Type parameters

| Name |
| :------ |
| `TData` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `options` | [`ProxyOptions`](../modules/store_src#proxyoptions)<`any`, `any`\> |

#### Returns

`Promise`<`TData`\>

#### Implementation of

StoreStorageAdapter.read

___

### write

▸ **write**<`TData`\>(`key`, `data`, `options`): `Promise`<`void`\>

#### Type parameters

| Name |
| :------ |
| `TData` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `data` | `TData` |
| `options` | [`ProxyOptions`](../modules/store_src#proxyoptions)<`any`, `any`\> |

#### Returns

`Promise`<`void`\>

#### Implementation of

StoreStorageAdapter.write
