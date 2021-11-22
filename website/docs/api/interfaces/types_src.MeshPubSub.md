---
title: 'MeshPubSub'
---

# Interface: MeshPubSub

[types/src](../modules/types_src).MeshPubSub

## Table of contents

### Methods

- [asyncIterator](types_src.MeshPubSub#asynciterator)
- [publish](types_src.MeshPubSub#publish)
- [subscribe](types_src.MeshPubSub#subscribe)
- [unsubscribe](types_src.MeshPubSub#unsubscribe)

## Methods

### asyncIterator

▸ **asyncIterator**<`THook`\>(`triggers`): `AsyncIterator`<[`AllHooks`](../modules/types_src#allhooks)[`THook`], `any`, `undefined`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `THook` | extends `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `triggers` | `THook` |

#### Returns

`AsyncIterator`<[`AllHooks`](../modules/types_src#allhooks)[`THook`], `any`, `undefined`\>

#### Defined in

[packages/types/src/index.ts:69](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L69)

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

[packages/types/src/index.ts:62](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L62)

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

[packages/types/src/index.ts:63](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L63)

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

[packages/types/src/index.ts:68](https://github.com/Urigo/graphql-mesh/blob/master/packages/types/src/index.ts#L68)
