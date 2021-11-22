---
title: 'GraphQLHandler'
---

# Class: GraphQLHandler

[handlers/graphql/src](../modules/handlers_graphql_src).GraphQLHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_graphql_src.GraphQLHandler#constructor)

### Methods

- [getMeshSource](handlers_graphql_src.GraphQLHandler#getmeshsource)

## Constructors

### constructor

• **new GraphQLHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)<[`GraphQLHandler`](/docs/api/interfaces/types_src.YamlConfig.GraphQLHandler)\> |

#### Defined in

[packages/handlers/graphql/src/index.ts:40](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/graphql/src/index.ts#L40)

## Methods

### getMeshSource

▸ **getMeshSource**(): `Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Returns

`Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/graphql/src/index.ts:48](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/graphql/src/index.ts#L48)
