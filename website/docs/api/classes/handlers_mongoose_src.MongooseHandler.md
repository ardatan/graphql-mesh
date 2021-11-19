---
title: 'MongooseHandler'
---

# Class: MongooseHandler

[handlers/mongoose/src](../modules/handlers_mongoose_src).MongooseHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_mongoose_src.MongooseHandler#constructor)

### Methods

- [getMeshSource](handlers_mongoose_src.MongooseHandler#getmeshsource)

## Constructors

### constructor

• **new MongooseHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)<[`MongooseHandler`](/docs/api/interfaces/types_src.YamlConfig.MongooseHandler)\> |

#### Defined in

[packages/handlers/mongoose/src/index.ts:38](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/mongoose/src/index.ts#L38)

## Methods

### getMeshSource

▸ **getMeshSource**(): `Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Returns

`Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/mongoose/src/index.ts:45](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/mongoose/src/index.ts#L45)
