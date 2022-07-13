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

## Properties

### flags

• **flags**: [`StoreFlags`](../modules/store_src#storeflags)

#### Defined in

[packages/store/src/index.ts:161](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L161)

___

### identifier

• **identifier**: `string`

#### Defined in

[packages/store/src/index.ts:161](https://github.com/Urigo/graphql-mesh/blob/master/packages/store/src/index.ts#L161)

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
| `options` | [`ProxyOptions`](../modules/store_src#proxyoptions)<`TData`, `any`\> |

#### Returns

[`StoreProxy`](../modules/store_src#storeproxy)<`TData`\>
