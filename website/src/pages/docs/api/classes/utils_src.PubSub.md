---
title: 'PubSub'
---

# Class: PubSub

[utils/src](../modules/utils_src).PubSub

## Implements

- [`MeshPubSub`](/docs/api/interfaces/types_src.MeshPubSub)

## Table of contents

### Constructors

- [constructor](utils_src.PubSub#constructor)

### Methods

- [asyncIterator](utils_src.PubSub#asynciterator)
- [publish](utils_src.PubSub#publish)
- [subscribe](utils_src.PubSub#subscribe)
- [unsubscribe](utils_src.PubSub#unsubscribe)

## Constructors

### constructor

• **new PubSub**()

## Methods

### asyncIterator

▸ **asyncIterator**\<`THook`>(`triggerName`): `AsyncIterable`\<[`AllHooks`](../modules/types_src#allhooks)[`THook`]>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `THook` | extends `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `triggerName` | `THook` |

#### Returns

`AsyncIterable`\<[`AllHooks`](../modules/types_src#allhooks)[`THook`]>

#### Implementation of

[MeshPubSub](/docs/api/interfaces/types_src.MeshPubSub).[asyncIterator](/docs/api/interfaces/types_src.MeshPubSub#asynciterator)

#### Defined in

[packages/utils/src/pubsub.ts:46](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/pubsub.ts#L46)

___

### publish

▸ **publish**\<`THook`>(`triggerName`, `detail`): `void`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `THook` | extends `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `triggerName` | `THook` |
| `detail` | [`AllHooks`](../modules/types_src#allhooks)[`THook`] |

#### Returns

`void`

#### Implementation of

[MeshPubSub](/docs/api/interfaces/types_src.MeshPubSub).[publish](/docs/api/interfaces/types_src.MeshPubSub#publish)

#### Defined in

[packages/utils/src/pubsub.ts:11](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/pubsub.ts#L11)

___

### subscribe

▸ **subscribe**\<`THook`>(`triggerName`, `onMessage`): `number`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `THook` | extends `string` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `triggerName` | `THook` |
| `onMessage` | `Listener`\<`THook`> |

#### Returns

`number`

#### Implementation of

[MeshPubSub](/docs/api/interfaces/types_src.MeshPubSub).[subscribe](/docs/api/interfaces/types_src.MeshPubSub#subscribe)

#### Defined in

[packages/utils/src/pubsub.ts:18](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/pubsub.ts#L18)

___

### unsubscribe

▸ **unsubscribe**(`subId`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `subId` | `number` |

#### Returns

`void`

#### Implementation of

[MeshPubSub](/docs/api/interfaces/types_src.MeshPubSub).[unsubscribe](/docs/api/interfaces/types_src.MeshPubSub#unsubscribe)

#### Defined in

[packages/utils/src/pubsub.ts:31](https://github.com/Urigo/graphql-mesh/blob/master/packages/utils/src/pubsub.ts#L31)
