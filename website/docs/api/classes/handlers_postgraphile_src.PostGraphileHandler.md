---
title: 'PostGraphileHandler'
---

# Class: PostGraphileHandler

[handlers/postgraphile/src](../modules/handlers_postgraphile_src).PostGraphileHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_postgraphile_src.PostGraphileHandler#constructor)

### Methods

- [getMeshSource](handlers_postgraphile_src.PostGraphileHandler#getmeshsource)

## Constructors

### constructor

• **new PostGraphileHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)<[`PostGraphileHandler`](/docs/api/interfaces/types_src.YamlConfig.PostGraphileHandler)\> |

#### Defined in

[packages/handlers/postgraphile/src/index.ts:29](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/postgraphile/src/index.ts#L29)

## Methods

### getMeshSource

▸ **getMeshSource**(): `Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Returns

`Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/postgraphile/src/index.ts:47](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/postgraphile/src/index.ts#L47)
