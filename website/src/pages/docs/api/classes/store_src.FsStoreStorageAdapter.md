---
title: 'FsStoreStorageAdapter'
---

# Class: FsStoreStorageAdapter

[store/src](../modules/store_src).FsStoreStorageAdapter

## Implements

- [`StoreStorageAdapter`](../modules/store_src#storestorageadapter)

## Table of contents

### Constructors

- [constructor](store_src.FsStoreStorageAdapter#constructor)

### Methods

- [delete](store_src.FsStoreStorageAdapter#delete)
- [read](store_src.FsStoreStorageAdapter#read)
- [write](store_src.FsStoreStorageAdapter#write)

## Constructors

### constructor

• **new FsStoreStorageAdapter**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`FsStoreStorageAdapterOptions`](/docs/api/interfaces/store_src.FsStoreStorageAdapterOptions) |

#### Defined in

[packages/store/src/index.ts:45](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L45)

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

StoreStorageAdapter.delete

#### Defined in

[packages/store/src/index.ts:84](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L84)

___

### read

▸ **read**\<`TData`, `TJSONData`>(`key`, `options`): `Promise`\<`TData`>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TData` | `TData` |
| `TJSONData` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `options` | [`ProxyOptions`](../modules/store_src#proxyoptions)\<`TData`, `TJSONData`> |

#### Returns

`Promise`\<`TData`>

#### Implementation of

StoreStorageAdapter.read

#### Defined in

[packages/store/src/index.ts:50](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L50)

___

### write

▸ **write**\<`TData`, `TJSONData`>(`key`, `data`, `options`): `Promise`\<`void`>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TData` | `TData` |
| `TJSONData` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `data` | `TData` |
| `options` | [`ProxyOptions`](../modules/store_src#proxyoptions)\<`TData`, `TJSONData`> |

#### Returns

`Promise`\<`void`>

#### Implementation of

StoreStorageAdapter.write

#### Defined in

[packages/store/src/index.ts:69](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L69)
