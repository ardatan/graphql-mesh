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

### Properties

- [mesh$](apollo_link_src.MeshApolloLink#mesh$)

### Methods

- [concat](apollo_link_src.MeshApolloLink#concat)
- [request](apollo_link_src.MeshApolloLink#request)
- [setOnError](apollo_link_src.MeshApolloLink#setonerror)
- [split](apollo_link_src.MeshApolloLink#split)
- [concat](apollo_link_src.MeshApolloLink#concat)
- [empty](apollo_link_src.MeshApolloLink#empty)
- [execute](apollo_link_src.MeshApolloLink#execute)
- [from](apollo_link_src.MeshApolloLink#from)
- [split](apollo_link_src.MeshApolloLink#split)

## Constructors

### constructor

• **new MeshApolloLink**(`getBuiltMesh`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `getBuiltMesh` | () => `Promise`<[`MeshInstance`](/docs/api/interfaces/runtime_src.MeshInstance)<`any`\>\> |

#### Overrides

ApolloLink.constructor

#### Defined in

[packages/apollo-link/src/index.ts:7](https://github.com/Urigo/graphql-mesh/blob/master/packages/apollo-link/src/index.ts#L7)

## Properties

### mesh$

• **mesh$**: `Promise`<[`MeshInstance`](/docs/api/interfaces/runtime_src.MeshInstance)<`any`\>\>

#### Defined in

[packages/apollo-link/src/index.ts:6](https://github.com/Urigo/graphql-mesh/blob/master/packages/apollo-link/src/index.ts#L6)

## Methods

### concat

▸ **concat**(`next`): `ApolloLink`

#### Parameters

| Name | Type |
| :------ | :------ |
| `next` | `ApolloLink` \| `RequestHandler` |

#### Returns

`ApolloLink`

#### Inherited from

ApolloLink.concat

#### Defined in

packages/apollo-link/node_modules/@apollo/client/link/core/ApolloLink.d.ts:11

___

### request

▸ **request**(`operation`): `Observable`<`FetchResult`<`Record`<`string`, `any`\>, `Record`<`string`, `any`\>, `Record`<`string`, `any`\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `operation` | `Operation` |

#### Returns

`Observable`<`FetchResult`<`Record`<`string`, `any`\>, `Record`<`string`, `any`\>, `Record`<`string`, `any`\>\>\>

#### Overrides

ApolloLink.request

#### Defined in

[packages/apollo-link/src/index.ts:12](https://github.com/Urigo/graphql-mesh/blob/master/packages/apollo-link/src/index.ts#L12)

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

#### Defined in

packages/apollo-link/node_modules/@apollo/client/link/core/ApolloLink.d.ts:14

___

### split

▸ **split**(`test`, `left`, `right?`): `ApolloLink`

#### Parameters

| Name | Type |
| :------ | :------ |
| `test` | (`op`: `Operation`) => `boolean` |
| `left` | `ApolloLink` \| `RequestHandler` |
| `right?` | `ApolloLink` \| `RequestHandler` |

#### Returns

`ApolloLink`

#### Inherited from

ApolloLink.split

#### Defined in

packages/apollo-link/node_modules/@apollo/client/link/core/ApolloLink.d.ts:10

___

### concat

▸ `Static` **concat**(`first`, `second`): `ApolloLink`

#### Parameters

| Name | Type |
| :------ | :------ |
| `first` | `ApolloLink` \| `RequestHandler` |
| `second` | `ApolloLink` \| `RequestHandler` |

#### Returns

`ApolloLink`

#### Inherited from

ApolloLink.concat

#### Defined in

packages/apollo-link/node_modules/@apollo/client/link/core/ApolloLink.d.ts:8

___

### empty

▸ `Static` **empty**(): `ApolloLink`

#### Returns

`ApolloLink`

#### Inherited from

ApolloLink.empty

#### Defined in

packages/apollo-link/node_modules/@apollo/client/link/core/ApolloLink.d.ts:4

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

#### Defined in

packages/apollo-link/node_modules/@apollo/client/link/core/ApolloLink.d.ts:7

___

### from

▸ `Static` **from**(`links`): `ApolloLink`

#### Parameters

| Name | Type |
| :------ | :------ |
| `links` | (`ApolloLink` \| `RequestHandler`)[] |

#### Returns

`ApolloLink`

#### Inherited from

ApolloLink.from

#### Defined in

packages/apollo-link/node_modules/@apollo/client/link/core/ApolloLink.d.ts:5

___

### split

▸ `Static` **split**(`test`, `left`, `right?`): `ApolloLink`

#### Parameters

| Name | Type |
| :------ | :------ |
| `test` | (`op`: `Operation`) => `boolean` |
| `left` | `ApolloLink` \| `RequestHandler` |
| `right?` | `ApolloLink` \| `RequestHandler` |

#### Returns

`ApolloLink`

#### Inherited from

ApolloLink.split

#### Defined in

packages/apollo-link/node_modules/@apollo/client/link/core/ApolloLink.d.ts:6
