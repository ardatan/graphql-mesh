---
title: 'MeshPubSub'
---

# Interface: MeshPubSub

[types/src](../modules/types_src).MeshPubSub

## Implemented by

- [`PubSub`](/docs/api/classes/utils_src.PubSub)

## Table of contents

### Methods

- [asyncIterator](types_src.MeshPubSub#asynciterator)
- [publish](types_src.MeshPubSub#publish)
- [subscribe](types_src.MeshPubSub#subscribe)
- [unsubscribe](types_src.MeshPubSub#unsubscribe)

## Methods

### asyncIterator

▸ **asyncIterator**\<`THook`>(`triggers`): `AsyncIterable`\<[`AllHooks`](../modules/types_src#allhooks)[`THook`]>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `THook` | extends `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `triggers` | `THook` |

#### Returns

`AsyncIterable`\<[`AllHooks`](../modules/types_src#allhooks)[`THook`]>

___

### publish

▸ **publish**\<`THook`>(`triggerName`, `payload`): `void`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `THook` | extends `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `triggerName` | `THook` |
| `payload` | [`AllHooks`](../modules/types_src#allhooks)[`THook`] |

#### Returns

`void`

___

### subscribe

▸ **subscribe**\<`THook`>(`triggerName`, `onMessage`, `options?`): `number`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `THook` | extends `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `triggerName` | `THook` |
| `onMessage` | (`data`: [`AllHooks`](../modules/types_src#allhooks)[`THook`]) => `void` |
| `options?` | `any` |

#### Returns

`number`

___

### unsubscribe

▸ **unsubscribe**(`subId`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `subId` | `number` |

#### Returns

`void`
