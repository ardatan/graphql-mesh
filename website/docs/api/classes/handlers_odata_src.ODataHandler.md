---
title: 'ODataHandler'
---

# Class: ODataHandler

[handlers/odata/src](../modules/handlers_odata_src).ODataHandler

## Implements

- [`MeshHandler`](/docs/api/interfaces/types_src.MeshHandler)

## Table of contents

### Constructors

- [constructor](handlers_odata_src.ODataHandler#constructor)

### Methods

- [getCachedMetadataJson](handlers_odata_src.ODataHandler#getcachedmetadatajson)
- [getMeshSource](handlers_odata_src.ODataHandler#getmeshsource)

## Constructors

### constructor

• **new ODataHandler**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`GetMeshSourceOptions`](../modules/types_src#getmeshsourceoptions)<[`ODataHandler`](/docs/api/interfaces/types_src.YamlConfig.ODataHandler)\> |

#### Defined in

[packages/handlers/odata/src/index.ts:135](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/odata/src/index.ts#L135)

## Methods

### getCachedMetadataJson

▸ **getCachedMetadataJson**(`fetch`): `Promise`<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `fetch` | (`input`: `RequestInfo`, `init?`: `RequestInit`) => `Promise`<`Response`\> |

#### Returns

`Promise`<`any`\>

#### Defined in

[packages/handlers/odata/src/index.ts:153](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/odata/src/index.ts#L153)

___

### getMeshSource

▸ **getMeshSource**(): `Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Returns

`Promise`<[`MeshSource`](../modules/types_src#meshsource)<`any`, `any`\>\>

#### Implementation of

[MeshHandler](/docs/api/interfaces/types_src.MeshHandler).[getMeshSource](/docs/api/interfaces/types_src.MeshHandler#getmeshsource)

#### Defined in

[packages/handlers/odata/src/index.ts:178](https://github.com/Urigo/graphql-mesh/blob/master/packages/handlers/odata/src/index.ts#L178)
