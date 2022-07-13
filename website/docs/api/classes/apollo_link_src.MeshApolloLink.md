---
title: 'MeshApolloLink'
---

# Class: MeshApolloLink

[apollo-link/src](../modules/apollo_link_src).MeshApolloLink

## Hierarchy

- `ApolloLink`

  ↳ **`MeshApolloLink`**

## Table of contents

### Constructors

- [constructor](apollo_link_src.MeshApolloLink#constructor)

### Methods

- [concat](apollo_link_src.MeshApolloLink#concat)
- [request](apollo_link_src.MeshApolloLink#request)
- [setOnError](apollo_link_src.MeshApolloLink#setonerror)
- [split](apollo_link_src.MeshApolloLink#split)
- [concat](apollo_link_src.MeshApolloLink#concat-1)
- [empty](apollo_link_src.MeshApolloLink#empty)
- [execute](apollo_link_src.MeshApolloLink#execute)
- [from](apollo_link_src.MeshApolloLink#from)
- [split](apollo_link_src.MeshApolloLink#split-1)

## Constructors

### constructor

• **new MeshApolloLink**(`options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`MeshApolloRequestHandlerOptions`](/docs/api/interfaces/apollo_link_src.MeshApolloRequestHandlerOptions) |

#### Overrides

ApolloLink.constructor

## Methods

### concat

▸ **concat**(`next`): `ApolloLink`

#### Parameters

| Name | Type |
| :------ | :------ |
| `next` | `RequestHandler` \| `ApolloLink` |

#### Returns

`ApolloLink`

#### Inherited from

ApolloLink.concat

___

### request

▸ **request**(`operation`, `forward?`): `Observable`<`FetchResult`<`Record`<`string`, `any`\>, `Record`<`string`, `any`\>, `Record`<`string`, `any`\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `operation` | `Operation` |
| `forward?` | `NextLink` |

#### Returns

`Observable`<`FetchResult`<`Record`<`string`, `any`\>, `Record`<`string`, `any`\>, `Record`<`string`, `any`\>\>\>

#### Inherited from

ApolloLink.request

___

### setOnError

▸ **setOnError**(`fn`): [`MeshApolloLink`](apollo_link_src.MeshApolloLink)

#### Parameters

| Name | Type |
| :------ | :------ |
| `fn` | (`error`: `any`, `observer?`: `Observer`<`FetchResult`<`Record`<`string`, `any`\>, `Record`<`string`, `any`\>, `Record`<`string`, `any`\>\>\>) => ``false`` \| `void` |

#### Returns

[`MeshApolloLink`](apollo_link_src.MeshApolloLink)

#### Inherited from

ApolloLink.setOnError

___

### split

▸ **split**(`test`, `left`, `right?`): `ApolloLink`

#### Parameters

| Name | Type |
| :------ | :------ |
| `test` | (`op`: `Operation`) => `boolean` |
| `left` | `RequestHandler` \| `ApolloLink` |
| `right?` | `RequestHandler` \| `ApolloLink` |

#### Returns

`ApolloLink`

#### Inherited from

ApolloLink.split

___

### concat

▸ `Static` **concat**(`first`, `second`): `ApolloLink`

#### Parameters

| Name | Type |
| :------ | :------ |
| `first` | `RequestHandler` \| `ApolloLink` |
| `second` | `RequestHandler` \| `ApolloLink` |

#### Returns

`ApolloLink`

#### Inherited from

ApolloLink.concat

___

### empty

▸ `Static` **empty**(): `ApolloLink`

#### Returns

`ApolloLink`

#### Inherited from

ApolloLink.empty

___

### execute

▸ `Static` **execute**(`link`, `operation`): `Observable`<`FetchResult`<`Record`<`string`, `any`\>, `Record`<`string`, `any`\>, `Record`<`string`, `any`\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `link` | `ApolloLink` |
| `operation` | `GraphQLRequest` |

#### Returns

`Observable`<`FetchResult`<`Record`<`string`, `any`\>, `Record`<`string`, `any`\>, `Record`<`string`, `any`\>\>\>

#### Inherited from

ApolloLink.execute

___

### from

▸ `Static` **from**(`links`): `ApolloLink`

#### Parameters

| Name | Type |
| :------ | :------ |
| `links` | (`RequestHandler` \| `ApolloLink`)[] |

#### Returns

`ApolloLink`

#### Inherited from

ApolloLink.from

___

### split

▸ `Static` **split**(`test`, `left`, `right?`): `ApolloLink`

#### Parameters

| Name | Type |
| :------ | :------ |
| `test` | (`op`: `Operation`) => `boolean` |
| `left` | `RequestHandler` \| `ApolloLink` |
| `right?` | `RequestHandler` \| `ApolloLink` |

#### Returns

`ApolloLink`

#### Inherited from

ApolloLink.split
