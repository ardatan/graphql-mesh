---
id: "store"
title: "@graphql-mesh/store"
sidebar_label: "store"
---

## Table of contents

### Enumerations

- [PredefinedProxyOptionsName](/docs/api/enums/store_src.PredefinedProxyOptionsName)

### Classes

- [FsStoreStorageAdapter](/docs/api/classes/store_src.FsStoreStorageAdapter)
- [InMemoryStoreStorageAdapter](/docs/api/classes/store_src.InMemoryStoreStorageAdapter)
- [MeshStore](/docs/api/classes/store_src.MeshStore)
- [ReadonlyStoreError](/docs/api/classes/store_src.ReadonlyStoreError)
- [ValidationError](/docs/api/classes/store_src.ValidationError)

### Interfaces

- [FsStoreStorageAdapterOptions](/docs/api/interfaces/store_src.FsStoreStorageAdapterOptions)

### Type aliases

- [ProxyOptions](store_src#proxyoptions)
- [StoreFlags](store_src#storeflags)
- [StoreProxy](store_src#storeproxy)
- [StoreStorageAdapter](store_src#storestorageadapter)

### Variables

- [PredefinedProxyOptions](store_src#predefinedproxyoptions)

## Type aliases

### ProxyOptions

Ƭ **ProxyOptions**<`TData`\>: `Object`

#### Type parameters

| Name |
| :------ |
| `TData` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `codify` | (`value`: `TData`, `identifier`: `string`) => `string` \| `Promise`<`string`\> |
| `validate` | (`oldValue`: `TData`, `newValue`: `TData`, `identifier`: `string`) => `void` \| `Promise`<`void`\> |

#### Defined in

[packages/store/src/index.ts:83](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L83)

___

### StoreFlags

Ƭ **StoreFlags**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `readonly` | `boolean` |
| `validate` | `boolean` |

#### Defined in

[packages/store/src/index.ts:88](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L88)

___

### StoreProxy

Ƭ **StoreProxy**<`TData`\>: `Object`

#### Type parameters

| Name |
| :------ |
| `TData` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `delete` | () => `Promise`<`void`\> |
| `get` | () => `Promise`<`TData`\> |
| `getWithSet` | (`setterFn`: () => `TData` \| `Promise`<`TData`\>) => `Promise`<`TData`\> |
| `set` | (`value`: `TData`) => `Promise`<`void`\> |

#### Defined in

[packages/store/src/index.ts:76](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L76)

___

### StoreStorageAdapter

Ƭ **StoreStorageAdapter**<`TData`, `TKey`\>: `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TData` | `any` |
| `TKey` | `string` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `delete` | (`key`: `TKey`) => `Promise`<`void`\> |
| `read` | (`key`: `TKey`, `options`: [`ProxyOptions`](store_src#proxyoptions)<`TData`\>) => `Promise`<`TData`\> |
| `write` | (`key`: `TKey`, `data`: `TData`, `options`: [`ProxyOptions`](store_src#proxyoptions)<`TData`\>) => `Promise`<`TData`\> |

#### Defined in

[packages/store/src/index.ts:12](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L12)

## Variables

### PredefinedProxyOptions

• **PredefinedProxyOptions**: `Record`<[`PredefinedProxyOptionsName`](/docs/api/enums/store_src.PredefinedProxyOptionsName), [`ProxyOptions`](store_src#proxyoptions)<`any`\>\>

#### Defined in

[packages/store/src/index.ts:101](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L101)
