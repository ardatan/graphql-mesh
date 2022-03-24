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

▸ **asyncIterator**<`THook`\>(`triggers`): `AsyncIterable`<[`AllHooks`](../modules/types_src#allhooks)[`THook`]\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `THook` | extends `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `triggers` | `THook` |

#### Returns

`AsyncIterable`<[`AllHooks`](../modules/types_src#allhooks)[`THook`]\>

#### Defined in

[packages/types/src/index.ts:66](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L66)

___

### publish

▸ **publish**<`THook`\>(`triggerName`, `payload`): `Promise`<`void`\>

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

`Promise`<`void`\>

#### Defined in

[packages/types/src/index.ts:59](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L59)

___

### subscribe

▸ **subscribe**<`THook`\>(`triggerName`, `onMessage`, `options?`): `Promise`<`number`\>

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

`Promise`<`number`\>

#### Defined in

[packages/types/src/index.ts:60](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L60)

___

### unsubscribe

▸ **unsubscribe**(`subId`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `subId` | `number` |

#### Returns

`void`

#### Defined in

[packages/types/src/index.ts:65](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L65)
