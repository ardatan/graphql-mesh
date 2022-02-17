---
title: 'MeshStore'
---

# Class: MeshStore

[store/src](../modules/store_src).MeshStore

## Table of contents

### Constructors

- [constructor](store_src.MeshStore#constructor)

### Properties

- [flags](store_src.MeshStore#flags)
- [identifier](store_src.MeshStore#identifier)

### Methods

- [child](store_src.MeshStore#child)
- [proxy](store_src.MeshStore#proxy)

## Constructors

### constructor

• **new MeshStore**(`identifier`, `storage`, `flags`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `identifier` | `string` |
| `storage` | [`StoreStorageAdapter`](../modules/store_src#storestorageadapter)<`any`, `string`\> |
| `flags` | [`StoreFlags`](../modules/store_src#storeflags) |

#### Defined in

[packages/store/src/index.ts:143](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L143)

## Properties

### flags

• **flags**: [`StoreFlags`](../modules/store_src#storeflags)

___

### identifier

• **identifier**: `string`

## Methods

### child

▸ **child**(`childIdentifier`, `flags?`): [`MeshStore`](store_src.MeshStore)

#### Parameters

| Name | Type |
| :------ | :------ |
| `childIdentifier` | `string` |
| `flags?` | `Partial`<[`StoreFlags`](../modules/store_src#storeflags)\> |

#### Returns

[`MeshStore`](store_src.MeshStore)

#### Defined in

[packages/store/src/index.ts:145](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L145)

___

### proxy

▸ **proxy**<`TData`\>(`id`, `options`): [`StoreProxy`](../modules/store_src#storeproxy)<`TData`\>

#### Type parameters

| Name |
| :------ |
| `TData` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | `string` |
| `options` | [`ProxyOptions`](../modules/store_src#proxyoptions)<`TData`\> |

#### Returns

[`StoreProxy`](../modules/store_src#storeproxy)<`TData`\>

#### Defined in

[packages/store/src/index.ts:152](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L152)
