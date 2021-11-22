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

[packages/store/src/index.ts:44](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L44)

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

StoreStorageAdapter.delete

#### Defined in

[packages/store/src/index.ts:69](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L69)

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
| `options` | [`ProxyOptions`](../modules/store_src#proxyoptions)<`any`\> |

#### Returns

`Promise`<`TData`\>

#### Implementation of

StoreStorageAdapter.read

#### Defined in

[packages/store/src/index.ts:50](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L50)

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
| `options` | [`ProxyOptions`](../modules/store_src#proxyoptions)<`any`\> |

#### Returns

`Promise`<`void`\>

#### Implementation of

StoreStorageAdapter.write

#### Defined in

[packages/store/src/index.ts:62](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L62)
